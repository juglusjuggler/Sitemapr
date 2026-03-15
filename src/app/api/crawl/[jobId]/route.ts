import { NextRequest, NextResponse } from 'next/server';
import { getJob, pauseCrawl, resumeCrawl, stopCrawl, clearResults, deleteJob } from '@/lib/crawler';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'pause':
        pauseCrawl(jobId);
        return NextResponse.json({ status: job.progress.status });
      case 'resume':
        resumeCrawl(jobId);
        return NextResponse.json({ status: job.progress.status });
      case 'stop':
        stopCrawl(jobId);
        return NextResponse.json({ status: job.progress.status });
      case 'clear':
        clearResults(jobId);
        return NextResponse.json({ status: job.progress.status });
      case 'delete':
        deleteJob(jobId);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const urls = Array.from(job.urls.values());

  return NextResponse.json({
    id: job.id,
    targetUrl: job.targetUrl,
    domain: job.domain,
    settings: job.settings,
    progress: job.progress,
    urls,
    logs: job.logs.slice(-200),
    createdAt: job.createdAt,
  });
}
