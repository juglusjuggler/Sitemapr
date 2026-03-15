'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { LogEntry } from '@/types';

interface LogConsoleProps {
  logs: LogEntry[];
}

const levelStyles: Record<string, string> = {
  info: 'text-gray-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-green-400',
  debug: 'text-gray-500',
};

const levelPrefix: Record<string, string> = {
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
  success: 'OK ',
  debug: 'DBG',
};

export function LogConsole({ logs }: LogConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (el) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      shouldAutoScroll.current = isNearBottom;
    }
  };

  return (
    <div className="relative rounded-xl border border-gray-700/40 bg-gray-950/90 backdrop-blur-sm overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-900/70 border-b border-gray-800/50">
        <Terminal className="w-4 h-4 text-green-400" />
        <span className="text-xs font-mono text-green-400 tracking-wider uppercase font-bold">Live Console</span>
        <div className="flex gap-1.5 ml-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-64 overflow-y-auto overflow-x-hidden p-3 font-mono text-xs leading-relaxed scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-600">
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-green-500"
            >
              ▊
            </motion.span>
            <span>Waiting for crawl to start...</span>
          </div>
        ) : (
          logs.map((log, i) => {
            const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return (
              <div key={i} className={`flex gap-2 py-0.5 ${levelStyles[log.level]}`}>
                <span className="text-gray-600 shrink-0">{time}</span>
                <span className="shrink-0 w-7 text-right opacity-60">[{levelPrefix[log.level]}]</span>
                <span className="break-all">{log.message}</span>
              </div>
            );
          })
        )}
        {logs.length > 0 && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="text-green-500 inline-block mt-1"
          >
            ▊
          </motion.span>
        )}
      </div>
    </div>
  );
}
