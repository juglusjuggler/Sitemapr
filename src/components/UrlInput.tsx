'use client';

import { useState } from 'react';
import { Globe, ChevronRight, AlertTriangle} from 'lucide-react';
import { motion } from 'framer-motion';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isRunning: boolean;
}

export function UrlInput({ onSubmit, isRunning }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL');
      return;
    }
    let testUrl = trimmed;
    if (!/^https?:\/\//i.test(testUrl)) {
      testUrl = 'https://' + testUrl;
    }
    try {
      const parsed = new URL(testUrl);
      if (!parsed.hostname.includes('.')) {
        setError('Please enter a valid domain');
        return;
      }
    } catch {
      setError('Invalid URL format');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-green-500/20 to-cyan-500/20 rounded-xl blur-sm group-hover:blur opacity-75 transition duration-500" />
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-gray-900/90 border border-gray-700/50 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="flex items-center px-3 sm:px-4 pt-3 sm:pt-0 text-cyan-400">
            <Globe className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(''); }}
            placeholder="Enter URL — e.g. https://example.com"
            className="flex-1 py-3 sm:py-4 px-2 bg-transparent text-gray-100 placeholder-gray-500 font-mono text-xs sm:text-sm focus:outline-none min-w-0"
            disabled={isRunning}
            spellCheck={false}
            autoComplete="url"
          />
          <motion.button
            type="submit"
            disabled={isRunning || !url.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="m-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-green-600 hover:from-cyan-500 hover:to-green-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Scanning...' : 'Scan'}
            {!isRunning && <ChevronRight className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-2 text-red-400 text-sm font-mono"
        >
          <AlertTriangle className="w-3 h-3" />
          {error}
        </motion.div>
      )}
    </form>
  );
}
