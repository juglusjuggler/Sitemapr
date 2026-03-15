'use client';

import { motion } from 'framer-motion';
import { CrawlProgress } from '@/types';

interface ProgressBarProps {
  progress: CrawlProgress;
}

const statusColors: Record<string, string> = {
  idle: 'text-gray-400',
  running: 'text-cyan-400',
  paused: 'text-amber-400',
  completed: 'text-green-400',
  stopped: 'text-orange-400',
  error: 'text-red-400',
};

const statusGlow: Record<string, string> = {
  running: 'shadow-cyan-500/30',
  completed: 'shadow-green-500/30',
  error: 'shadow-red-500/30',
};

export function ProgressBar({ progress }: ProgressBarProps) {
  const isActive = progress.status === 'running';
  const pct = progress.progressPercent;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          {isActive && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="inline-block w-2 h-2 rounded-full bg-cyan-400"
            />
          )}
          <span className={`uppercase tracking-widest font-bold ${statusColors[progress.status] || 'text-gray-400'}`}>
            {progress.status}
          </span>
        </div>
        <span className="text-gray-400">
          {pct}% — {progress.totalProcessed}/{progress.totalDiscovered} pages
        </span>
      </div>
      <div className={`relative h-2 bg-gray-800/80 rounded-full overflow-hidden border border-gray-700/30 ${statusGlow[progress.status] || ''}`}>
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${
            progress.status === 'completed'
              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
              : progress.status === 'error'
              ? 'bg-gradient-to-r from-red-600 to-red-400'
              : progress.status === 'paused'
              ? 'bg-gradient-to-r from-amber-600 to-amber-400'
              : 'bg-gradient-to-r from-cyan-600 to-green-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {isActive && (
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '300%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{ width: '30%' }}
          />
        )}
      </div>
      {progress.estimatedRemainingMs && isActive && (
        <div className="text-[10px] text-gray-500 font-mono text-right">
          ETA: ~{Math.ceil(progress.estimatedRemainingMs / 1000)}s remaining
        </div>
      )}
    </div>
  );
}
