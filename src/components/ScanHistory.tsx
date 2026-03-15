'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trash2, Clock, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { CrawlJobSummary, CrawlStatus } from '@/types';

interface ScanHistoryProps {
  currentJobId: string | null;
}

const statusColors: Record<CrawlStatus, string> = {
  idle: 'bg-gray-500',
  running: 'bg-cyan-500',
  paused: 'bg-amber-500',
  completed: 'bg-green-500',
  stopped: 'bg-orange-500',
  error: 'bg-red-500',
};

export function ScanHistory({ currentJobId }: ScanHistoryProps) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<CrawlJobSummary[]>([]);

  useEffect(() => {
    if (open) {
      fetch('/api/crawl')
        .then((r) => r.json())
        .then((data) => setJobs(data))
        .catch(() => {});
    }
  }, [open, currentJobId]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/crawl/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  return (
    <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-200">Scan History</span>
          {jobs.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {jobs.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-800/30 space-y-2 pt-3 max-h-64 overflow-y-auto">
              {jobs.length === 0 ? (
                <p className="text-xs text-gray-600 font-mono text-center py-4">No scan history yet</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                      job.id === currentJobId
                        ? 'bg-cyan-500/5 border-cyan-500/20'
                        : 'bg-gray-800/20 border-gray-700/20 hover:border-gray-600/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusColors[job.status]}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-gray-500 shrink-0" />
                          <span className="text-xs text-gray-300 font-mono truncate">{job.domain}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-gray-600" />
                          <span className="text-[10px] text-gray-600 font-mono">
                            {new Date(job.createdAt).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            {job.totalDiscovered} URLs
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
