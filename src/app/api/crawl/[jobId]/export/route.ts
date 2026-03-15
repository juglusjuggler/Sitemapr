import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/crawler';
import { generateXmlSitemap, generateTxtSitemap, generateJsonSitemap, generateCsvSitemap } from '@/lib/export';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const format = request.nextUrl.searchParams.get('format') || 'xml';
  const urls = Array.from(job.urls.values());

  switch (format) {
    case 'xml': {
      const xml = generateXmlSitemap(urls);
      return new Response(xml, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="sitemap-${job.domain}.xml"`,
        },
      });
    }
    case 'txt': {
      const txt = generateTxtSitemap(urls);
      return new Response(txt, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="sitemap-${job.domain}.txt"`,
        },
      });
    }
    case 'json': {
      const json = generateJsonSitemap(urls);
      return new Response(json, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="sitemap-${job.domain}.json"`,
        },
      });
    }
    case 'csv': {
      const csv = generateCsvSitemap(urls);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sitemap-${job.domain}.csv"`,
        },
      });
    }
    default:
      return NextResponse.json({ error: 'Invalid format. Use xml, txt, json, or csv.' }, { status: 400 });
  }
}
