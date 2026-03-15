export function normalizeUrl(rawUrl: string, baseUrl?: string): string | null {
  try {
    const resolved = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
    resolved.hash = '';
    resolved.hostname = resolved.hostname.toLowerCase();

    let pathname = resolved.pathname.replace(/\/+/g, '/');
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    resolved.pathname = pathname;

    return resolved.toString();
  } catch {
    return null;
  }
}

export function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'ref', 'mc_cid', 'mc_eid',
    ];
    trackingParams.forEach((p) => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isSameDomain(url: string, domain: string, includeSubdomains: boolean): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const target = domain.toLowerCase();
    if (host === target) return true;
    if (includeSubdomains && host.endsWith('.' + target)) return true;
    return false;
  } catch {
    return false;
  }
}

export function isValidCrawlUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const ext = parsed.pathname.split('.').pop()?.toLowerCase() || '';
    const skipExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff',
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'zip', 'rar', 'tar', 'gz', '7z',
      'mp3', 'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
      'css', 'js', 'woff', 'woff2', 'ttf', 'eot', 'otf',
      'xml', 'rss', 'atom',
    ];
    if (skipExtensions.includes(ext)) return false;
    return true;
  } catch {
    return false;
  }
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function validateInputUrl(url: string): { valid: boolean; normalized: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, normalized: '', error: 'URL is required' };
  }

  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, normalized: '', error: 'Only HTTP and HTTPS URLs are supported' };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { valid: false, normalized: '', error: 'Invalid domain' };
    }
    // Block private/internal IPs
    const host = parsed.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      return { valid: false, normalized: '', error: 'Cannot crawl local/private addresses' };
    }
    return { valid: true, normalized: parsed.origin + parsed.pathname };
  } catch {
    return { valid: false, normalized: '', error: 'Invalid URL format' };
  }
}
