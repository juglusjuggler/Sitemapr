export type CrawlStatus = 'idle' | 'running' | 'paused' | 'completed' | 'stopped' | 'error';

export interface CrawlSettings {
  maxConcurrency: number;
  requestTimeout: number;
  maxDepth: number;
  maxPages: number;
  crawlDelay: number;
  obeyRobotsTxt: boolean;
  includeSubdomains: boolean;
  ignoreQueryParams: boolean;
  retryFailed: boolean;
  maxRetries: number;
  followRedirects: boolean;
  userAgent: string;
  includePaths: string;
  excludePaths: string;
}

export interface DiscoveredUrl {
  url: string;
  statusCode: number | null;
  title: string;
  depth: number;
  discoveredAt: string;
  scannedAt: string | null;
  contentType: string;
  canonical: string;
  crawlStatus: 'queued' | 'fetching' | 'success' | 'failed' | 'skipped';
  error?: string;
  retryCount: number;
}

export interface CrawlProgress {
  status: CrawlStatus;
  totalDiscovered: number;
  totalProcessed: number;
  totalQueued: number;
  activeWorkers: number;
  failedUrls: number;
  currentDepth: number;
  progressPercent: number;
  startedAt: string | null;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  pagesPerSecond: number;
}

export interface CrawlJob {
  id: string;
  targetUrl: string;
  domain: string;
  settings: CrawlSettings;
  progress: CrawlProgress;
  urls: Map<string, DiscoveredUrl>;
  logs: LogEntry[];
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'debug';
  message: string;
}

export interface CrawlJobSummary {
  id: string;
  targetUrl: string;
  domain: string;
  status: CrawlStatus;
  totalDiscovered: number;
  totalProcessed: number;
  failedUrls: number;
  createdAt: string;
  startedAt: string | null;
  elapsedMs: number;
}

export const DEFAULT_SETTINGS: CrawlSettings = {
  maxConcurrency: 3,
  requestTimeout: 10000,
  maxDepth: 10,
  maxPages: 500,
  crawlDelay: 200,
  obeyRobotsTxt: true,
  includeSubdomains: false,
  ignoreQueryParams: false,
  retryFailed: true,
  maxRetries: 2,
  followRedirects: true,
  userAgent: 'Sitemapr/1.0 (+https://github.com/sitemapr)',
  includePaths: '',
  excludePaths: '',
};
