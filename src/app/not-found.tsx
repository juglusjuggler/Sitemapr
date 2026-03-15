'use client';

import { motion } from 'framer-motion';
import { Radar, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/30 bg-gray-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <Radar className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400 shrink-0" />
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Site<span className="text-cyan-400">mapr</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-gray-500 font-mono uppercase tracking-widest -mt-0.5">
              Sitemap Generator v1.0
            </p>
          </div>
        </div>
      </header>

      {/* 404 Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-md space-y-6"
        >
          {/* Glitch 404 number */}
          <div className="relative">
            <motion.div
              animate={{ opacity: [0.1, 0.05, 0.1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-[12rem] sm:text-[16rem] font-black text-cyan-500/5 font-mono select-none leading-none">
                404
              </span>
            </motion.div>
            <div className="relative pt-8 sm:pt-12">
              <motion.div
                animate={{ x: [0, -2, 2, 0] }}
                transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 3 }}
              >
                <h2 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-green-400 to-cyan-400 font-mono">
                  404
                </h2>
              </motion.div>
            </div>
          </div>

          {/* Icon + Message */}
          <div className="space-y-3">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </motion.div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Page Not Found
            </h3>
            <p className="text-sm text-gray-400 font-mono leading-relaxed">
              The requested URL could not be resolved.
              <br />
              <span className="text-gray-600">Target does not exist in the current scope.</span>
            </p>
          </div>

          {/* Terminal-style error */}
          <div className="rounded-lg border border-gray-700/30 bg-gray-950/80 p-4 text-left font-mono text-xs">
            <div className="flex items-center gap-2 mb-2 text-gray-600">
              <span className="w-2 h-2 rounded-full bg-red-500/70" />
              <span className="w-2 h-2 rounded-full bg-amber-500/70" />
              <span className="w-2 h-2 rounded-full bg-green-500/70" />
              <span className="ml-1 text-[10px] uppercase tracking-wider">error output</span>
            </div>
            <div className="space-y-1">
              <p className="text-red-400">
                <span className="text-gray-600">[ERR]</span> Route resolution failed
              </p>
              <p className="text-gray-500">
                <span className="text-gray-600">[INF]</span> Status: 404 NOT_FOUND
              </p>
              <p className="text-gray-500">
                <span className="text-gray-600">[INF]</span> Suggestion: Return to dashboard
              </p>
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-green-500 inline-block mt-1"
              >
                ▊
              </motion.span>
            </div>
          </div>

          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-green-600 hover:from-cyan-500 hover:to-green-500 text-white font-semibold text-sm rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
