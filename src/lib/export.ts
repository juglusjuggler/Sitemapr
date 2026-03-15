import { DiscoveredUrl } from '@/types';

export function generateXmlSitemap(urls: DiscoveredUrl[]): string {
  const successUrls = urls.filter((u) => u.crawlStatus === 'success' && u.statusCode === 200);
  const entries = successUrls
    .map((u) => {
      const loc = escapeXml(u.url);
      const lastmod = u.scannedAt ? new Date(u.scannedAt).toISOString().split('T')[0] : '';
      return `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`;
}

export function generateTxtSitemap(urls: DiscoveredUrl[]): string {
  return urls
    .filter((u) => u.crawlStatus === 'success' && u.statusCode === 200)
    .map((u) => u.url)
    .join('\n');
}

export function generateJsonSitemap(urls: DiscoveredUrl[]): string {
  const data = urls.map((u) => ({
    url: u.url,
    statusCode: u.statusCode,
    title: u.title,
    depth: u.depth,
    contentType: u.contentType,
    canonical: u.canonical,
    discoveredAt: u.discoveredAt,
    scannedAt: u.scannedAt,
  }));
  return JSON.stringify(data, null, 2);
}

export function generateCsvSitemap(urls: DiscoveredUrl[]): string {
  const header = 'URL,Status Code,Title,Depth,Content Type,Discovered At,Scanned At';
  const rows = urls.map((u) =>
    [
      `"${u.url}"`,
      u.statusCode ?? '',
      `"${(u.title || '').replace(/"/g, '""')}"`,
      u.depth,
      `"${u.contentType}"`,
      u.discoveredAt,
      u.scannedAt || '',
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
