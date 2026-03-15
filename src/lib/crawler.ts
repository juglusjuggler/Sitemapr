import * as cheerio from 'cheerio';
import { CrawlJob, CrawlSettings, CrawlStatus, DiscoveredUrl, LogEntry } from '@/types';
import { normalizeUrl, isSameDomain, isValidCrawlUrl, getDomain, stripTrackingParams } from './url-utils';
import { fetchRobotsTxt, isAllowedByRobots } from './robots';

type SSECallback = (event: string, data: unknown) => void;

const jobs = new Map<string, CrawlJob>();
const jobAbortControllers = new Map<string, AbortController>();
const sseListeners = new Map<string, Set<SSECallback>>();

// --- Fast regex-based link extractor (avoids full DOM parse for link discovery) ---
const HREF_RE = /<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const CANONICAL_RE = /<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']*)["'][^>]*>/i;
const CANONICAL_RE2 = /<link[^>]*href\s*=\s*["']([^"']*)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i;

function extractLinksRegex(html: string): string[] {
  const links: string[] = [];
  let match;
  HREF_RE.lastIndex = 0;
  while ((match = HREF_RE.exec(html)) !== null) {
    const href = match[1] || match[2] || match[3];
    if (href) links.push(href);
  }
  return links;
}

function extractTitleRegex(html: string): string {
  const match = TITLE_RE.exec(html);
  if (match) {
    return match[1].replace(/\s+/g, ' ').trim().slice(0, 200);
  }
  return '';
}

function extractCanonicalRegex(html: string): string {
  const match = CANONICAL_RE.exec(html) || CANONICAL_RE2.exec(html);
  return match ? match[1] : '';
}

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
  if (job.logs.length > 5000) job.logs = job.logs.slice(-4000);
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
  addLog(job, 'success', `▶ Crawl started: ${job.targetUrl} (${job.settings.maxConcurrency} workers)`);
  emitProgress(job);

  const { settings } = job;
  const queue: { url: string; depth: number }[] = [];
  let activeWorkerCount = 0;
  let robotsRules: { path: string; allow: boolean }[] = [];

  // Determine parse mode: use fast regex for high concurrency, cheerio for low
  const useFastParser = settings.maxConcurrency > 5;

  // Throttled SSE progress — emit at most every 100ms to avoid flooding
  let lastProgressEmit = 0;
  const PROGRESS_INTERVAL = 100;
  function throttledEmitProgress() {
    const now = Date.now();
    if (now - lastProgressEmit >= PROGRESS_INTERVAL) {
      lastProgressEmit = now;
      updateProgressStats(job);
      emitProgress(job);
    }
  }

  // Throttled logging — at high concurrency, only log every Nth success
  let successCount = 0;
  const LOG_EVERY = settings.maxConcurrency > 20 ? 50 : settings.maxConcurrency > 5 ? 10 : 1;

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

  // --- Resolve a discovered href into a canonical URL or null ---
  function resolveHref(href: string, baseUrl: string): string | null {
    let resolved = normalizeUrl(href, baseUrl);
    if (!resolved) return null;
    if (settings.ignoreQueryParams) {
      resolved = stripTrackingParams(resolved);
      try {
        const u = new URL(resolved);
        u.search = '';
        resolved = u.toString();
      } catch { /* keep */ }
    } else {
      resolved = stripTrackingParams(resolved);
    }
    if (!isValidCrawlUrl(resolved)) return null;
    if (!isSameDomain(resolved, job.domain, settings.includeSubdomains)) return null;
    return resolved;
  }

  // --- Add a newly discovered URL to the queue ---
  function enqueueUrl(resolved: string, depth: number) {
    if (job.urls.has(resolved)) return;
    if (job.progress.totalDiscovered >= settings.maxPages) return;
    const newEntry: DiscoveredUrl = {
      url: resolved,
      statusCode: null,
      title: '',
      depth,
      discoveredAt: new Date().toISOString(),
      scannedAt: null,
      contentType: '',
      canonical: '',
      crawlStatus: 'queued',
      retryCount: 0,
    };
    job.urls.set(resolved, newEntry);
    queue.push({ url: resolved, depth });
    job.progress.totalDiscovered++;
    job.progress.totalQueued++;
    if (depth > job.progress.currentDepth) {
      job.progress.currentDepth = depth;
    }
  }

  // --- Process a single URL (called by workers) ---
  async function processUrl(item: { url: string; depth: number }): Promise<void> {
    if (abortController.signal.aborted) return;

    // Wait while paused
    while (getStatus() === 'paused') {
      await sleep(200);
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
          job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
          job.progress.totalProcessed++;
          throttledEmitProgress();
          return;
        }
      } catch { /* proceed */ }
    }

    // Check include/exclude patterns
    if (includePatterns.length > 0 && !matchesPatterns(item.url, includePatterns)) {
      urlEntry.crawlStatus = 'skipped';
      job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
      job.progress.totalProcessed++;
      throttledEmitProgress();
      return;
    }
    if (excludePatterns.length > 0 && matchesPatterns(item.url, excludePatterns)) {
      urlEntry.crawlStatus = 'skipped';
      job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
      job.progress.totalProcessed++;
      throttledEmitProgress();
      return;
    }

    urlEntry.crawlStatus = 'fetching';
    activeWorkerCount++;
    job.progress.activeWorkers = activeWorkerCount;
    throttledEmitProgress();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), settings.requestTimeout);

      const response = await fetch(item.url, {
        headers: {
          'User-Agent': settings.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
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

        if (useFastParser) {
          // Fast regex-based extraction — avoids full DOM parse overhead
          urlEntry.title = extractTitleRegex(html);
          const rawCanonical = extractCanonicalRegex(html);
          if (rawCanonical) {
            urlEntry.canonical = normalizeUrl(rawCanonical, item.url) || '';
          }
          if (item.depth < settings.maxDepth) {
            const hrefs = extractLinksRegex(html);
            for (const href of hrefs) {
              if (abortController.signal.aborted) break;
              if (job.progress.totalDiscovered >= settings.maxPages) break;
              const resolved = resolveHref(href, item.url);
              if (resolved) enqueueUrl(resolved, item.depth + 1);
            }
          }
        } else {
          // Full cheerio parse for accuracy at low concurrency
          const $ = cheerio.load(html);
          urlEntry.title = $('title').first().text().trim().slice(0, 200);
          const canonical = $('link[rel="canonical"]').attr('href');
          if (canonical) {
            urlEntry.canonical = normalizeUrl(canonical, item.url) || '';
          }
          if (item.depth < settings.maxDepth) {
            $('a[href]').each((_, el) => {
              if (abortController.signal.aborted) return;
              if (job.progress.totalDiscovered >= settings.maxPages) return;
              const href = $(el).attr('href');
              if (!href) return;
              const resolved = resolveHref(href, item.url);
              if (resolved) enqueueUrl(resolved, item.depth + 1);
            });
          }
        }

        urlEntry.crawlStatus = 'success';
        successCount++;
        if (successCount % LOG_EVERY === 0 || successCount <= 5) {
          addLog(job, 'success', `✓ [${response.status}] ${item.url}${urlEntry.title ? ` — "${urlEntry.title}"` : ''} (${successCount} done)`);
        }
      } else if (response.ok) {
        urlEntry.crawlStatus = 'success';
        successCount++;
        // Don't consume body for non-HTML to save time
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
      } else {
        addLog(job, 'error', `✗ Failed: ${item.url} — ${message}`);
      }
    } finally {
      activeWorkerCount--;
      job.progress.activeWorkers = activeWorkerCount;
      job.progress.totalProcessed++;
      job.progress.totalQueued = Math.max(0, job.progress.totalQueued - 1);
      throttledEmitProgress();
    }
  }

  // --- Worker pool: each worker independently pulls from queue ---
  async function worker(workerId: number): Promise<void> {
    let idleCount = 0;
    const MAX_IDLE = 20; // Give up after 2s of empty queue (20 * 100ms)

    while (!abortController.signal.aborted && getStatus() !== 'stopped') {
      // Paused — spin-wait
      if (getStatus() === 'paused') {
        await sleep(200);
        idleCount = 0;
        continue;
      }

      // Max pages reached
      if (job.progress.totalProcessed >= settings.maxPages) break;

      // Pull from queue
      const item = queue.shift();
      if (!item) {
        idleCount++;
        if (idleCount >= MAX_IDLE && activeWorkerCount === 0) break;
        await sleep(100);
        continue;
      }

      idleCount = 0;
      await processUrl(item);

      // Per-worker crawl delay (not per-batch!) to spread load
      if (settings.crawlDelay > 0) {
        await sleep(settings.crawlDelay);
      }
    }
  }

  // Launch workers
  try {
    const workerCount = Math.min(settings.maxConcurrency, 200);
    addLog(job, 'info', `Launching ${workerCount} concurrent workers...`);

    // Start a progress ticker for consistent UI updates
    const progressTicker = setInterval(() => {
      if (getStatus() === 'running' || getStatus() === 'paused') {
        updateProgressStats(job);
        emitProgress(job);
      }
    }, 250);

    const workers = Array.from({ length: workerCount }, (_, i) => worker(i));
    await Promise.all(workers);

    clearInterval(progressTicker);
  } catch (err) {
    if (!abortController.signal.aborted) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      job.progress.status = 'error';
      addLog(job, 'error', `Crawl error: ${message}`);
    }
  }

  if (job.progress.status === 'running') {
    job.progress.status = 'completed';
    addLog(job, 'success', `■ Crawl completed. ${job.progress.totalProcessed} pages processed, ${job.progress.totalDiscovered} URLs discovered. ${job.progress.pagesPerSecond} pages/sec.`);
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
