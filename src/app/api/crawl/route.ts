import { NextRequest, NextResponse } from 'next/server';
import { createJob, startCrawl, getAllJobs } from '@/lib/crawler';
import { validateInputUrl } from '@/lib/url-utils';
import { DEFAULT_SETTINGS, CrawlSettings } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, settings } = body as { url: string; settings?: Partial<CrawlSettings> };

    const validation = validateInputUrl(url);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const mergedSettings: CrawlSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
      maxConcurrency: Math.min(Math.max(1, settings?.maxConcurrency ?? DEFAULT_SETTINGS.maxConcurrency), 10),
      maxDepth: Math.min(Math.max(1, settings?.maxDepth ?? DEFAULT_SETTINGS.maxDepth), 50),
      maxPages: Math.min(Math.max(1, settings?.maxPages ?? DEFAULT_SETTINGS.maxPages), 5000),
      crawlDelay: Math.max(0, settings?.crawlDelay ?? DEFAULT_SETTINGS.crawlDelay),
      requestTimeout: Math.min(Math.max(1000, settings?.requestTimeout ?? DEFAULT_SETTINGS.requestTimeout), 30000),
      maxRetries: Math.min(Math.max(0, settings?.maxRetries ?? DEFAULT_SETTINGS.maxRetries), 5),
    };

    const job = createJob(validation.normalized, mergedSettings);

    // Start crawl in the background
    startCrawl(job.id).catch(() => {});

    return NextResponse.json({
      id: job.id,
      targetUrl: job.targetUrl,
      domain: job.domain,
      status: job.progress.status,
      createdAt: job.createdAt,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  const jobs = getAllJobs();
  const summaries = jobs.map((job) => ({
    id: job.id,
    targetUrl: job.targetUrl,
    domain: job.domain,
    status: job.progress.status,
    totalDiscovered: job.progress.totalDiscovered,
    totalProcessed: job.progress.totalProcessed,
    failedUrls: job.progress.failedUrls,
    createdAt: job.createdAt,
    startedAt: job.progress.startedAt,
    elapsedMs: job.progress.elapsedMs,
  }));
  return NextResponse.json(summaries);
}
