import * as cheerio from 'cheerio';
import { CrawlJob, CrawlSettings, CrawlStatus, DiscoveredUrl, LogEntry } from '@/types';
import { normalizeUrl, isSameDomain, isValidCrawlUrl, getDomain, stripTrackingParams } from './url-utils';
import { fetchRobotsTxt, isAllowedByRobots } from './robots';

type SSECallback = (event: string, data: unknown) => void;

const jobs = new Map<string, CrawlJob>();
const jobAbortControllers = new Map<string, AbortController>();
const sseListeners = new Map<string, Set<SSECallback>>();

export function getJob(id: string): CrawlJob | undefined {
  return jobs.get(id);
}

export function getAllJobs(): CrawlJob[] {
  return Array.from(jobs.values());
}

export function deleteJob(id: string): boolean {
  stopCrawl(id);
  sseListeners.delete(id);
  return jobs.delete(id);
}

function emitSSE(jobId: string, event: string, data: unknown) {
  const listeners = sseListeners.get(jobId);
  if (listeners) {
    for (const cb of listeners) {
      try { cb(event, data); } catch { /* ignore */ }
    }
  }
}

export function addSSEListener(jobId: string, cb: SSECallback): () => void {
  if (!sseListeners.has(jobId)) sseListeners.set(jobId, new Set());
  sseListeners.get(jobId)!.add(cb);
  return () => {
    sseListeners.get(jobId)?.delete(cb);
  };
}

function addLog(job: CrawlJob, level: LogEntry['level'], message: string) {
  const entry: LogEntry = { timestamp: new Date().toISOString(), level, message };
  job.logs.push(entry);
  if (job.logs.length > 2000) job.logs = job.logs.slice(-1500);
  emitSSE(job.id, 'log', entry);
}

function emitProgress(job: CrawlJob) {
  emitSSE(job.id, 'progress', job.progress);
}

export function createJob(targetUrl: string, settings: CrawlSettings): CrawlJob {
  const id = generateId();
  const domain = getDomain(targetUrl);
  const job: CrawlJob = {
    id,
    targetUrl,
    domain,
    settings,
    progress: {
      status: 'idle',
      totalDiscovered: 0,
      totalProcessed: 0,
      totalQueued: 0,
      activeWorkers: 0,
      failedUrls: 0,
      currentDepth: 0,
      progressPercent: 0,
      startedAt: null,
      elapsedMs: 0,
      estimatedRemainingMs: null,
      pagesPerSecond: 0,
    },
    urls: new Map(),
    logs: [],
    createdAt: new Date().toISOString(),
  };

  jobs.set(id, job);
  addLog(job, 'info', `Job created for ${targetUrl}`);
  return job;
}

export function stopCrawl(jobId: string) {
  const controller = jobAbortControllers.get(jobId);
  if (controller) {
    controller.abort();
    jobAbortControllers.delete(jobId);
  }
  const job = jobs.get(jobId);
  if (job && (job.progress.status === 'running' || job.progress.status === 'paused')) {
    job.progress.status = 'stopped';
    addLog(job, 'warn', 'Crawl stopped by user');
    emitProgress(job);
  }
}

export function pauseCrawl(jobId: string) {
  const job = jobs.get(jobId);
  if (job && job.progress.status === 'running') {
    job.progress.status = 'paused';
    addLog(job, 'warn', 'Crawl paused');
    emitProgress(job);
  }
}

export function resumeCrawl(jobId: string) {
  const job = jobs.get(jobId);
  if (job && job.progress.status === 'paused') {
    job.progress.status = 'running';
    addLog(job, 'info', 'Crawl resumed');
    emitProgress(job);
  }
}

export function clearResults(jobId: string) {
  const job = jobs.get(jobId);
  if (job && (job.progress.status === 'completed' || job.progress.status === 'stopped' || job.progress.status === 'error')) {
    job.urls.clear();
    job.logs = [];
    job.progress = {
      status: 'idle',
      totalDiscovered: 0,
      totalProcessed: 0,
      totalQueued: 0,
      activeWorkers: 0,
      failedUrls: 0,
      currentDepth: 0,
      progressPercent: 0,
      startedAt: null,
      elapsedMs: 0,
      estimatedRemainingMs: null,
      pagesPerSecond: 0,
    };
    addLog(job, 'info', 'Results cleared');
    emitProgress(job);
  }
}

export async function startCrawl(jobId: string) {
  const maybeJob = jobs.get(jobId);
  if (!maybeJob) return;
  const job: CrawlJob = maybeJob;

  const abortController = new AbortController();
  jobAbortControllers.set(jobId, abortController);

  job.progress.status = 'running';
  job.progress.startedAt = new Date().toISOString();
  addLog(job, 'success', `▶ Crawl started: ${job.targetUrl}`);
  emitProgress(job);

  const { settings } = job;
  const queue: { url: string; depth: number }[] = [];
  let robotsRules: { path: string; allow: boolean }[] = [];

  // Fetch robots.txt
  if (settings.obeyRobotsTxt) {
    try {
      addLog(job, 'info', `Fetching robots.txt for ${job.domain}...`);
      const robotsData = await fetchRobotsTxt(job.domain, settings.userAgent);
      robotsRules = robotsData.rules;
      if (robotsData.crawlDelay && robotsData.crawlDelay > settings.crawlDelay) {
        addLog(job, 'warn', `robots.txt requests crawl-delay of ${robotsData.crawlDelay}ms`);
      }
      addLog(job, 'info', `robots.txt loaded: ${robotsRules.length} rules found`);
    } catch {
      addLog(job, 'warn', 'Could not fetch robots.txt, proceeding without it');
    }
  }

  // Seed queue
  const seedUrl = normalizeUrl(job.targetUrl);
  if (!seedUrl) {
    job.progress.status = 'error';
    addLog(job, 'error', 'Invalid target URL');
    emitProgress(job);
    return;
  }

  const seedEntry: DiscoveredUrl = {
    url: seedUrl,
    statusCode: null,
    title: '',
    depth: 0,
    discoveredAt: new Date().toISOString(),
    scannedAt: null,
    contentType: '',
    canonical: '',
    crawlStatus: 'queued',
    retryCount: 0,
  };
  job.urls.set(seedUrl, seedEntry);
  queue.push({ url: seedUrl, depth: 0 });
  job.progress.totalDiscovered = 1;
  job.progress.totalQueued = 1;
  emitProgress(job);

  // Include/exclude patterns
  const includePatterns = settings.includePaths
    ? settings.includePaths.split(',').map((p) => p.trim()).filter(Boolean)
    : [];
  const excludePatterns = settings.excludePaths
    ? settings.excludePaths.split(',').map((p) => p.trim()).filter(Boolean)
    : [];

  function matchesPatterns(url: string, patterns: string[]): boolean {
    try {
      const pathname = new URL(url).pathname;
      return patterns.some((p) => pathname.includes(p));
    } catch {
      return false;
    }
  }

  const getStatus = () => job.progress.status as CrawlStatus;

  // Worker function
  async function processUrl(item: { url: string; depth: number }): Promise<void> {
    if (abortController.signal.aborted) return;

    // Wait while paused
    while (getStatus() === 'paused') {
      await sleep(500);
      if (abortController.signal.aborted) return;
    }

    if (getStatus() !== 'running') return;

    const urlEntry = job.urls.get(item.url);
    if (!urlEntry || urlEntry.crawlStatus !== 'queued') return;

    // Check robots.txt
    if (settings.obeyRobotsTxt && robotsRules.length > 0) {
      try {
        const pathname = new URL(item.url).pathname;
        if (!isAllowedByRobots(pathname, robotsRules)) {
          urlEntry.crawlStatus = 'skipped';
          addLog(job, 'warn', `⊘ Blocked by robots.txt: ${item.url}`);
          job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
          job.progress.totalProcessed++;
          emitProgress(job);
          return;
        }
      } catch { /* proceed */ }
    }

    // Check include/exclude patterns
    if (includePatterns.length > 0 && !matchesPatterns(item.url, includePatterns)) {
      urlEntry.crawlStatus = 'skipped';
      job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
      job.progress.totalProcessed++;
      emitProgress(job);
      return;
    }
    if (excludePatterns.length > 0 && matchesPatterns(item.url, excludePatterns)) {
      urlEntry.crawlStatus = 'skipped';
      addLog(job, 'info', `⊘ Excluded by pattern: ${item.url}`);
      job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
      job.progress.totalProcessed++;
      emitProgress(job);
      return;
    }

    urlEntry.crawlStatus = 'fetching';
    job.progress.activeWorkers++;
    addLog(job, 'info', `→ Fetching: ${item.url}`);
    emitProgress(job);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), settings.requestTimeout);
      
      const response = await fetch(item.url, {
        headers: {
          'User-Agent': settings.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: settings.followRedirects ? 'follow' : 'manual',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      urlEntry.statusCode = response.status;
      urlEntry.contentType = response.headers.get('content-type') || '';
      urlEntry.scannedAt = new Date().toISOString();

      if (response.ok && urlEntry.contentType.includes('text/html')) {
        const html = await response.text();
        const $ = cheerio.load(html);

        // Extract title
        urlEntry.title = $('title').first().text().trim().slice(0, 200);

        // Extract canonical
        const canonical = $('link[rel="canonical"]').attr('href');
        if (canonical) {
          urlEntry.canonical = normalizeUrl(canonical, item.url) || '';
        }

        // Extract links
        if (item.depth < settings.maxDepth) {
          $('a[href]').each((_, el) => {
            if (abortController.signal.aborted) return;
            if (job.progress.totalDiscovered >= settings.maxPages) return;

            const href = $(el).attr('href');
            if (!href) return;

            let resolved = normalizeUrl(href, item.url);
            if (!resolved) return;

            if (settings.ignoreQueryParams) {
              resolved = stripTrackingParams(resolved);
              try {
                const u = new URL(resolved);
                u.search = '';
                resolved = u.toString();
              } catch { /* keep as is */ }
            } else {
              resolved = stripTrackingParams(resolved);
            }

            if (!isValidCrawlUrl(resolved)) return;
            if (!isSameDomain(resolved, job.domain, settings.includeSubdomains)) return;
            if (job.urls.has(resolved)) return;

            const newEntry: DiscoveredUrl = {
              url: resolved,
              statusCode: null,
              title: '',
              depth: item.depth + 1,
              discoveredAt: new Date().toISOString(),
              scannedAt: null,
              contentType: '',
              canonical: '',
              crawlStatus: 'queued',
              retryCount: 0,
            };
            job.urls.set(resolved, newEntry);
            queue.push({ url: resolved, depth: item.depth + 1 });
            job.progress.totalDiscovered++;
            job.progress.totalQueued++;

            if (item.depth + 1 > job.progress.currentDepth) {
              job.progress.currentDepth = item.depth + 1;
            }
          });
        }

        urlEntry.crawlStatus = 'success';
        addLog(job, 'success', `✓ [${response.status}] ${item.url}${urlEntry.title ? ` — "${urlEntry.title}"` : ''}`);
      } else if (response.ok) {
        urlEntry.crawlStatus = 'success';
        addLog(job, 'info', `✓ [${response.status}] Non-HTML: ${item.url}`);
      } else {
        urlEntry.crawlStatus = 'failed';
        urlEntry.error = `HTTP ${response.status}`;
        job.progress.failedUrls++;
        addLog(job, 'error', `✗ [${response.status}] ${item.url}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      urlEntry.crawlStatus = 'failed';
      urlEntry.error = message;
      job.progress.failedUrls++;

      if (settings.retryFailed && urlEntry.retryCount < settings.maxRetries) {
        urlEntry.retryCount++;
        urlEntry.crawlStatus = 'queued';
        queue.push({ url: item.url, depth: item.depth });
        job.progress.failedUrls--;
        addLog(job, 'warn', `↻ Retry ${urlEntry.retryCount}/${settings.maxRetries}: ${item.url} (${message})`);
      } else {
        addLog(job, 'error', `✗ Failed: ${item.url} — ${message}`);
      }
    } finally {
      job.progress.activeWorkers = Math.max(0, job.progress.activeWorkers - 1);
      job.progress.totalProcessed++;
      job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
      updateProgressStats(job);
      emitProgress(job);
    }
  }

  // Main crawl loop
  try {
    while (queue.length > 0 && !abortController.signal.aborted && getStatus() !== 'stopped') {
      if (getStatus() === 'paused') {
        await sleep(500);
        continue;
      }

      if (job.progress.totalProcessed >= settings.maxPages) {
        addLog(job, 'warn', `Max pages limit reached (${settings.maxPages})`);
        break;
      }

      const batch: { url: string; depth: number }[] = [];
      const batchSize = Math.min(settings.maxConcurrency, queue.length);
      for (let i = 0; i < batchSize; i++) {
        const item = queue.shift();
        if (item) batch.push(item);
      }

      if (batch.length === 0) break;

      await Promise.all(batch.map((item) => processUrl(item)));

      if (settings.crawlDelay > 0) {
        await sleep(settings.crawlDelay);
      }
    }
  } catch (err) {
    if (!abortController.signal.aborted) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      job.progress.status = 'error';
      addLog(job, 'error', `Crawl error: ${message}`);
    }
  }

  if (job.progress.status === 'running') {
    job.progress.status = 'completed';
    addLog(job, 'success', `■ Crawl completed. ${job.progress.totalProcessed} pages processed, ${job.progress.totalDiscovered} URLs discovered.`);
  }

  job.progress.activeWorkers = 0;
  updateProgressStats(job);
  emitProgress(job);
  emitSSE(job.id, 'done', null);
  jobAbortControllers.delete(jobId);
}

function updateProgressStats(job: CrawlJob) {
  const { progress } = job;
  if (progress.startedAt) {
    progress.elapsedMs = Date.now() - new Date(progress.startedAt).getTime();
    if (progress.elapsedMs > 0 && progress.totalProcessed > 0) {
      progress.pagesPerSecond = Math.round((progress.totalProcessed / (progress.elapsedMs / 1000)) * 100) / 100;
    }
  }

  const total = progress.totalDiscovered;
  if (total > 0) {
    progress.progressPercent = Math.min(100, Math.round((progress.totalProcessed / total) * 100));
  }

  if (progress.pagesPerSecond > 0 && progress.totalQueued > 0) {
    progress.estimatedRemainingMs = Math.round((progress.totalQueued / progress.pagesPerSecond) * 1000);
  } else {
    progress.estimatedRemainingMs = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
