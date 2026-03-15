'use client';

import { motion } from 'framer-motion';
import { Activity, Globe, CheckCircle, XCircle, Layers, Zap, Clock, Gauge } from 'lucide-react';
import { CrawlProgress } from '@/types';

interface StatsCardsProps {
  progress: CrawlProgress;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '0s';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  if (mins < 60) return `${mins}m ${remSecs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

const cards = [
  {
    key: 'discovered',
    label: 'Discovered',
    icon: Globe,
    color: 'cyan',
    getValue: (p: CrawlProgress) => p.totalDiscovered,
  },
  {
    key: 'processed',
    label: 'Processed',
    icon: CheckCircle,
    color: 'green',
    getValue: (p: CrawlProgress) => p.totalProcessed,
  },
  {
    key: 'queued',
    label: 'In Queue',
    icon: Layers,
    color: 'amber',
    getValue: (p: CrawlProgress) => p.totalQueued,
  },
  {
    key: 'failed',
    label: 'Failed',
    icon: XCircle,
    color: 'red',
    getValue: (p: CrawlProgress) => p.failedUrls,
  },
  {
    key: 'workers',
    label: 'Workers',
    icon: Activity,
    color: 'purple',
    getValue: (p: CrawlProgress) => p.activeWorkers,
  },
  {
    key: 'depth',
    label: 'Depth',
    icon: Layers,
    color: 'blue',
    getValue: (p: CrawlProgress) => p.currentDepth,
  },
  {
    key: 'speed',
    label: 'Pages/sec',
    icon: Zap,
    color: 'yellow',
    getValue: (p: CrawlProgress) => p.pagesPerSecond,
  },
  {
    key: 'elapsed',
    label: 'Elapsed',
    icon: Clock,
    color: 'slate',
    getValue: (p: CrawlProgress) => formatDuration(p.elapsedMs),
  },
];

const colorMap: Record<string, string> = {
  cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  green: 'from-green-500/10 to-green-500/5 border-green-500/20 text-green-400',
  amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
  red: 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-400',
  purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
  blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
  yellow: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400',
  slate: 'from-slate-500/10 to-slate-500/5 border-slate-500/20 text-slate-400',
};

const glowMap: Record<string, string> = {
  cyan: 'shadow-cyan-500/10',
  green: 'shadow-green-500/10',
  amber: 'shadow-amber-500/10',
  red: 'shadow-red-500/10',
  purple: 'shadow-purple-500/10',
  blue: 'shadow-blue-500/10',
  yellow: 'shadow-yellow-500/10',
  slate: 'shadow-slate-500/10',
};

export function StatsCards({ progress }: StatsCardsProps) {
  const isActive = progress.status === 'running';

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-8">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const value = card.getValue(progress);
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={`relative p-3 rounded-lg border bg-gradient-to-b backdrop-blur-sm shadow-lg ${colorMap[card.color]} ${glowMap[card.color]}`}
          >
            {isActive && card.key === 'workers' && progress.activeWorkers > 0 && (
              <div className="absolute top-2 right-2">
                <Gauge className="w-3 h-3 text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            )}
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3.5 h-3.5 opacity-60" />
              <span className="text-[10px] uppercase tracking-wider opacity-60 font-medium">{card.label}</span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono truncate">{value}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
