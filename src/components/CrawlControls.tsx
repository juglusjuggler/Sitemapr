'use client';

import { Pause, Play, Square, Trash2, RotateCcw } from 'lucide-react';
import { CrawlStatus } from '@/types';

interface CrawlControlsProps {
  status: CrawlStatus;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClear: () => void;
  onRetry: () => void;
}

export function CrawlControls({ status, onPause, onResume, onStop, onClear, onRetry }: CrawlControlsProps) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isDone = ['completed', 'stopped', 'error'].includes(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isRunning && (
        <button
          onClick={onPause}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
        >
          <Pause className="w-3.5 h-3.5" /> Pause
        </button>
      )}
      {isPaused && (
        <button
          onClick={onResume}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
        >
          <Play className="w-3.5 h-3.5" /> Resume
        </button>
      )}
      {(isRunning || isPaused) && (
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
        >
          <Square className="w-3.5 h-3.5" /> Stop
        </button>
      )}
      {isDone && (
        <>
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium hover:bg-purple-500/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry Failed
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 text-xs font-medium hover:bg-gray-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        </>
      )}
    </div>
  );
}
