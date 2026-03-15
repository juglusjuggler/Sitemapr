interface RobotsRule {
  path: string;
  allow: boolean;
}

interface RobotsData {
  rules: RobotsRule[];
  crawlDelay: number | null;
  sitemaps: string[];
}

const robotsCache = new Map<string, { data: RobotsData; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchRobotsTxt(domain: string, userAgent: string): Promise<RobotsData> {
  const cacheKey = domain;
  const cached = robotsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const defaultData: RobotsData = { rules: [], crawlDelay: null, sitemaps: [] };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${domain}/robots.txt`, {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      robotsCache.set(cacheKey, { data: defaultData, fetchedAt: Date.now() });
      return defaultData;
    }

    const text = await res.text();
    const data = parseRobotsTxt(text);
    robotsCache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    robotsCache.set(cacheKey, { data: defaultData, fetchedAt: Date.now() });
    return defaultData;
  }
}

function parseRobotsTxt(content: string): RobotsData {
  const lines = content.split('\n');
  const rules: RobotsRule[] = [];
  let crawlDelay: number | null = null;
  const sitemaps: string[] = [];
  let isRelevantAgent = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const [directive, ...valueParts] = line.split(':');
    const key = directive.trim().toLowerCase();
    const value = valueParts.join(':').trim();

    if (key === 'user-agent') {
      isRelevantAgent = value === '*' || value.toLowerCase().includes('sitemapr');
    } else if (key === 'sitemap') {
      sitemaps.push(value);
    } else if (isRelevantAgent) {
      if (key === 'disallow' && value) {
        rules.push({ path: value, allow: false });
      } else if (key === 'allow' && value) {
        rules.push({ path: value, allow: true });
      } else if (key === 'crawl-delay') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) crawlDelay = parsed * 1000;
      }
    }
  }

  return { rules, crawlDelay, sitemaps };
}

export function isAllowedByRobots(pathname: string, rules: RobotsRule[]): boolean {
  let bestMatch: RobotsRule | null = null;
  let bestLen = 0;

  for (const rule of rules) {
    if (pathname.startsWith(rule.path) && rule.path.length > bestLen) {
      bestMatch = rule;
      bestLen = rule.path.length;
    }
  }

  return bestMatch ? bestMatch.allow : true;
}
