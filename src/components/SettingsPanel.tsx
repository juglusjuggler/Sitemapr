'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import { CrawlSettings } from '@/types';

interface SettingsPanelProps {
  settings: CrawlSettings;
  onChange: (updates: Partial<CrawlSettings>) => void;
  disabled?: boolean;
}

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-700/30 bg-gray-900/40 backdrop-blur-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-gray-200">Advanced Settings</span>
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
            <div className="px-4 pb-4 space-y-4 border-t border-gray-800/30">
              {/* Concurrency Warning */}
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Higher concurrency speeds up crawling but increases load on the target server. Use conservative settings for production sites.
                </p>
              </div>

              {/* Performance */}
              <Section title="Performance">
                <NumberInput
                  label="Max Concurrency"
                  value={settings.maxConcurrency}
                  onChange={(v) => onChange({ maxConcurrency: v })}
                  min={1} max={10} disabled={disabled}
                  hint="Number of concurrent workers (1–10)"
                />
                <NumberInput
                  label="Crawl Delay (ms)"
                  value={settings.crawlDelay}
                  onChange={(v) => onChange({ crawlDelay: v })}
                  min={0} max={10000} step={50} disabled={disabled}
                  hint="Delay between batch requests"
                />
                <NumberInput
                  label="Request Timeout (ms)"
                  value={settings.requestTimeout}
                  onChange={(v) => onChange({ requestTimeout: v })}
                  min={1000} max={30000} step={1000} disabled={disabled}
                  hint="Timeout per individual request"
                />
              </Section>

              {/* Limits */}
              <Section title="Limits">
                <NumberInput
                  label="Max Depth"
                  value={settings.maxDepth}
                  onChange={(v) => onChange({ maxDepth: v })}
                  min={1} max={50} disabled={disabled}
                  hint="Maximum link depth to follow"
                />
                <NumberInput
                  label="Max Pages"
                  value={settings.maxPages}
                  onChange={(v) => onChange({ maxPages: v })}
                  min={1} max={5000} step={10} disabled={disabled}
                  hint="Maximum total pages to crawl"
                />
              </Section>

              {/* Behavior */}
              <Section title="Behavior">
                <ToggleInput
                  label="Obey robots.txt"
                  value={settings.obeyRobotsTxt}
                  onChange={(v) => onChange({ obeyRobotsTxt: v })}
                  disabled={disabled}
                />
                <ToggleInput
                  label="Include Subdomains"
                  value={settings.includeSubdomains}
                  onChange={(v) => onChange({ includeSubdomains: v })}
                  disabled={disabled}
                />
                <ToggleInput
                  label="Ignore Query Parameters"
                  value={settings.ignoreQueryParams}
                  onChange={(v) => onChange({ ignoreQueryParams: v })}
                  disabled={disabled}
                />
                <ToggleInput
                  label="Follow Redirects"
                  value={settings.followRedirects}
                  onChange={(v) => onChange({ followRedirects: v })}
                  disabled={disabled}
                />
              </Section>

              {/* Retry */}
              <Section title="Retry">
                <ToggleInput
                  label="Retry Failed URLs"
                  value={settings.retryFailed}
                  onChange={(v) => onChange({ retryFailed: v })}
                  disabled={disabled}
                />
                {settings.retryFailed && (
                  <NumberInput
                    label="Max Retries"
                    value={settings.maxRetries}
                    onChange={(v) => onChange({ maxRetries: v })}
                    min={0} max={5} disabled={disabled}
                    hint="Retries per failed URL"
                  />
                )}
              </Section>

              {/* Advanced */}
              <Section title="Advanced">
                <TextInput
                  label="User Agent"
                  value={settings.userAgent}
                  onChange={(v) => onChange({ userAgent: v })}
                  disabled={disabled}
                />
                <TextInput
                  label="Include Paths (comma-separated)"
                  value={settings.includePaths}
                  onChange={(v) => onChange({ includePaths: v })}
                  disabled={disabled}
                  placeholder="/blog, /docs"
                />
                <TextInput
                  label="Exclude Paths (comma-separated)"
                  value={settings.excludePaths}
                  onChange={(v) => onChange({ excludePaths: v })}
                  disabled={disabled}
                  placeholder="/admin, /api"
                />
              </Section>

              {/* Ethical notice */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300/80 leading-relaxed">
                  Only crawl websites you are authorized to scan. Respect rate limits and terms of service. Sitemapr is designed for ethical use only.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NumberInput({
  label, value, onChange, min, max, step = 1, disabled, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; disabled?: boolean; hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label className="text-xs text-gray-300">{label}</label>
        {hint && <p className="text-[10px] text-gray-600">{hint}</p>}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        min={min} max={max} step={step}
        disabled={disabled}
        className="w-24 px-2 py-1.5 bg-gray-800/60 border border-gray-700/40 rounded text-gray-200 text-xs font-mono text-right focus:outline-none focus:border-cyan-500/40 disabled:opacity-40"
      />
    </div>
  );
}

function ToggleInput({
  label, value, onChange, disabled,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-gray-300">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-cyan-600' : 'bg-gray-700'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <motion.span
          className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
          animate={{ left: value ? '1.1rem' : '0.15rem' }}
          transition={{ duration: 0.15 }}
        />
      </button>
    </div>
  );
}

function TextInput({
  label, value, onChange, disabled, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 bg-gray-800/60 border border-gray-700/40 rounded text-gray-200 text-xs font-mono focus:outline-none focus:border-cyan-500/40 disabled:opacity-40 placeholder:text-gray-600"
      />
    </div>
  );
}
