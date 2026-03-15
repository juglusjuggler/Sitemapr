'use client';

import { motion } from 'framer-motion';
import { Radar, Shield, Zap } from 'lucide-react';
import { useCrawl } from '@/hooks/useCrawl';
import { UrlInput } from '@/components/UrlInput';
import { SettingsPanel } from '@/components/SettingsPanel';
import { StatsCards } from '@/components/StatsCards';
import { ProgressBar } from '@/components/ProgressBar';
import { CrawlControls } from '@/components/CrawlControls';
import { LogConsole } from '@/components/LogConsole';
import { ResultsTable } from '@/components/ResultsTable';
import { ScanHistory } from '@/components/ScanHistory';

export default function Home() {
  const crawl = useCrawl();
  const isActive = ['running', 'paused'].includes(crawl.progress.status);
  const hasResults = crawl.urls.length > 0;
  const showDashboard = crawl.progress.status !== 'idle' || hasResults;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800/30 bg-gray-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <motion.div
              animate={isActive ? { rotate: 360 } : {}}
              transition={isActive ? { repeat: Infinity, duration: 4, ease: 'linear' } : {}}
              className="shrink-0"
            >
              <Radar className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Site<span className="text-cyan-400">mapr</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono uppercase tracking-widest -mt-0.5 truncate">
                Sitemap Generator v1.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {isActive && (
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs text-cyan-400 font-mono"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span className="hidden xs:inline">SCANNING</span>
              </motion.div>
            )}
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-600 font-mono">
              <Shield className="w-3 h-3" />
              ETHICAL USE ONLY
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Hero Section — only show when idle/no results */}
        {!showDashboard && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-8 sm:py-16 space-y-4 sm:space-y-6"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[10px] sm:text-xs font-mono"
            >
              <Zap className="w-3 h-3" /> Cyberpunk Sitemap Generator
            </motion.div>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight px-2">
              Discover every page.
              <br />
              <span className="glow-text text-cyan-400">Generate your sitemap.</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed px-2">
              Enter any website URL and watch as Sitemapr crawls through all internal pages in real time.
              Export your sitemap in XML, JSON, CSV, or TXT format. Fully configurable crawl engine with
              adjustable concurrency, depth limits, and smart URL normalization.
            </p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-gray-500 font-mono px-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-green-500" /> Live Progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cyan-500" /> Multi-format Export
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-purple-500" /> Adjustable Workers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-500" /> robots.txt Aware
              </span>
            </div>
          </motion.section>
        )}

        {/* URL Input */}
        <section className="space-y-4">
          <UrlInput
            onSubmit={(url) => crawl.startCrawl(url)}
            isRunning={isActive}
          />

          {crawl.error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono"
            >
              {crawl.error}
            </motion.div>
          )}
        </section>

        {/* Settings + History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SettingsPanel
            settings={crawl.settings}
            onChange={crawl.updateSettings}
            disabled={isActive}
          />
          <ScanHistory currentJobId={crawl.jobId} />
        </div>

        {/* Dashboard (visible when crawl has started) */}
        {showDashboard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Progress + Controls */}
            <div className="p-3 sm:p-4 rounded-xl border border-gray-700/30 bg-gray-900/30 backdrop-blur-sm space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200">Crawl Progress</h3>
                  {crawl.progress.startedAt && (
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Target: {crawl.jobId ? crawl.urls[0]?.url || '—' : '—'}
                    </p>
                  )}
                </div>
                <CrawlControls
                  status={crawl.progress.status}
                  onPause={crawl.pause}
                  onResume={crawl.resume}
                  onStop={crawl.stop}
                  onClear={crawl.clear}
                  onRetry={crawl.retryFailed}
                />
              </div>
              <ProgressBar progress={crawl.progress} />
            </div>

            {/* Stats Cards */}
            <StatsCards progress={crawl.progress} />

            {/* Log Console */}
            <LogConsole logs={crawl.logs} />

            {/* Results Table */}
            {hasResults && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Discovered URLs
                </h3>
                <ResultsTable urls={crawl.urls} jobId={crawl.jobId} />
              </div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-800/20 pt-6 pb-8 text-center space-y-2">
          <p className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">
            Sitemapr — Cyberpunk Sitemap Generator
          </p>
          <p className="text-[10px] text-gray-700 max-w-md mx-auto">
            Only crawl websites you own or have explicit authorization to scan.
            This tool is intended for legitimate, ethical use only.
          </p>
        </footer>
      </div>
    </main>
  );
}
