import { NextRequest } from 'next/server';
import { getJob, addSSEListener } from '@/lib/crawler';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(job.progress)}\n\n`));

      // Send last 50 logs
      const recentLogs = job.logs.slice(-50);
      for (const log of recentLogs) {
        controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify(log)}\n\n`));
      }

      const removeListener = addSSEListener(jobId, (event, data) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          if (event === 'done') {
            removeListener();
            controller.close();
          }
        } catch {
          removeListener();
        }
      });

      // Heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          removeListener();
        }
      }, 15000);

      // Clean up if the job is already done
      if (['completed', 'stopped', 'error'].includes(job.progress.status)) {
        setTimeout(() => {
          removeListener();
          clearInterval(heartbeat);
          try { controller.close(); } catch { /* ignore */ }
        }, 1000);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
