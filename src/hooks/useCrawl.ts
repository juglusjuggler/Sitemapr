import { useState, useCallback, useRef, useEffect } from 'react';
import { CrawlProgress, CrawlSettings, DiscoveredUrl, LogEntry, DEFAULT_SETTINGS } from '@/types';

interface CrawlState {
  jobId: string | null;
  progress: CrawlProgress;
  urls: DiscoveredUrl[];
  logs: LogEntry[];
  settings: CrawlSettings;
  error: string | null;
}

const initialProgress: CrawlProgress = {
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

export function useCrawl() {
  const [state, setState] = useState<CrawlState>({
    jobId: null,
    progress: initialProgress,
    urls: [],
    logs: [],
    settings: DEFAULT_SETTINGS,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateSettings = useCallback((updates: Partial<CrawlSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  }, []);

  const connectSSE = useCallback((jobId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/crawl/${jobId}/stream`);
    eventSourceRef.current = es;

    es.addEventListener('progress', (e) => {
      const progress = JSON.parse(e.data) as CrawlProgress;
      setState((prev) => ({ ...prev, progress }));
    });

    es.addEventListener('log', (e) => {
      const log = JSON.parse(e.data) as LogEntry;
      setState((prev) => ({
        ...prev,
        logs: [...prev.logs.slice(-500), log],
      }));
    });

    es.addEventListener('done', () => {
      es.close();
      eventSourceRef.current = null;
      // Fetch final results
      fetchResults(jobId);
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      // Start polling as fallback
      startPolling(jobId);
    };
  }, []);

  const startPolling = useCallback((jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchResults(jobId), 2000);
  }, []);

  const fetchResults = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/crawl/${jobId}`);
      if (!res.ok) return;
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        progress: data.progress,
        urls: data.urls,
        logs: data.logs,
      }));

      if (['completed', 'stopped', 'error'].includes(data.progress.status)) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch { /* ignore */ }
  }, []);

  const startCrawl = useCallback(async (url: string) => {
    setState((prev) => ({
      ...prev,
      error: null,
      urls: [],
      logs: [],
      progress: { ...initialProgress, status: 'running' },
    }));

    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, settings: state.settings }),
      });

      if (!res.ok) {
        const data = await res.json();
        setState((prev) => ({ ...prev, error: data.error || 'Failed to start crawl', progress: initialProgress }));
        return;
      }

      const data = await res.json();
      setState((prev) => ({ ...prev, jobId: data.id }));
      connectSSE(data.id);
    } catch {
      setState((prev) => ({ ...prev, error: 'Network error', progress: initialProgress }));
    }
  }, [state.settings, connectSSE]);

  const sendControl = useCallback(async (action: string) => {
    if (!state.jobId) return;
    try {
      await fetch(`/api/crawl/${state.jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (action === 'clear') {
        setState((prev) => ({
          ...prev,
          urls: [],
          logs: [],
          progress: initialProgress,
          jobId: null,
        }));
      }

      if (action === 'stop') {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setTimeout(() => fetchResults(state.jobId!), 500);
      }
    } catch { /* ignore */ }
  }, [state.jobId, fetchResults]);

  const pause = useCallback(() => sendControl('pause'), [sendControl]);
  const resume = useCallback(() => sendControl('resume'), [sendControl]);
  const stop = useCallback(() => sendControl('stop'), [sendControl]);
  const clear = useCallback(() => sendControl('clear'), [sendControl]);

  const retryFailed = useCallback(async () => {
    // Re-start crawl for failed URLs
    if (!state.jobId) return;
    // For MVP, we re-fetch to update state
    await fetchResults(state.jobId);
  }, [state.jobId, fetchResults]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return {
    ...state,
    startCrawl,
    pause,
    resume,
    stop,
    clear,
    retryFailed,
    updateSettings,
    fetchResults,
  };
}
