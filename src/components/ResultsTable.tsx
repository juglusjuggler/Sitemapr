'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Copy, FileText, FileJson, FileSpreadsheet, FileCode, Check, ExternalLink } from 'lucide-react';
import { DiscoveredUrl } from '@/types';

interface ResultsTableProps {
  urls: DiscoveredUrl[];
  jobId: string | null;
}

type SortField = 'url' | 'statusCode' | 'depth' | 'crawlStatus';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

export function ResultsTable({ urls, jobId }: ResultsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [depthFilter, setDepthFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('depth');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    let result = [...urls];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.url.toLowerCase().includes(q) ||
          u.title.toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'success') {
      result = result.filter((u) => u.crawlStatus === 'success' && u.statusCode === 200);
    } else if (statusFilter === 'failed') {
      result = result.filter((u) => u.crawlStatus === 'failed');
    } else if (statusFilter === 'redirect') {
      result = result.filter((u) => u.statusCode && u.statusCode >= 300 && u.statusCode < 400);
    } else if (statusFilter === '4xx') {
      result = result.filter((u) => u.statusCode && u.statusCode >= 400 && u.statusCode < 500);
    } else if (statusFilter === '5xx') {
      result = result.filter((u) => u.statusCode && u.statusCode >= 500);
    }

    if (depthFilter !== 'all') {
      result = result.filter((u) => u.depth === parseInt(depthFilter));
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'url') cmp = a.url.localeCompare(b.url);
      else if (sortField === 'statusCode') cmp = (a.statusCode || 0) - (b.statusCode || 0);
      else if (sortField === 'depth') cmp = a.depth - b.depth;
      else if (sortField === 'crawlStatus') cmp = a.crawlStatus.localeCompare(b.crawlStatus);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [urls, search, statusFilter, depthFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const depths = useMemo(() => [...new Set(urls.map((u) => u.depth))].sort(), [urls]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleCopyAll = async () => {
    const text = filtered
      .filter((u) => u.crawlStatus === 'success' && u.statusCode === 200)
      .map((u) => u.url)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = (u: DiscoveredUrl) => {
    if (u.crawlStatus === 'success' && u.statusCode === 200) {
      return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20">200</span>;
    }
    if (u.crawlStatus === 'failed') {
      return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20">{u.statusCode || 'ERR'}</span>;
    }
    if (u.statusCode && u.statusCode >= 300 && u.statusCode < 400) {
      return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">{u.statusCode}</span>;
    }
    if (u.statusCode && u.statusCode >= 400) {
      return <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-red-500/10 text-red-400 border border-red-500/20">{u.statusCode}</span>;
    }
    return <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-gray-500/10 text-gray-500 border border-gray-500/20">{u.crawlStatus}</span>;
  };

  return (
    <div className="space-y-3 min-w-0 w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search URLs..."
            className="w-full pl-9 pr-3 py-2 bg-gray-900/60 border border-gray-700/40 rounded-lg text-gray-200 text-xs font-mono focus:outline-none focus:border-cyan-500/40 placeholder:text-gray-600"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-900/60 border border-gray-700/40 rounded-lg text-gray-300 text-xs focus:outline-none focus:border-cyan-500/40"
          >
            <option value="all">All Status</option>
            <option value="success">200 OK</option>
            <option value="redirect">Redirects</option>
            <option value="4xx">4xx Errors</option>
            <option value="5xx">5xx Errors</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={depthFilter}
            onChange={(e) => { setDepthFilter(e.target.value); setPage(0); }}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-900/60 border border-gray-700/40 rounded-lg text-gray-300 text-xs focus:outline-none focus:border-cyan-500/40"
          >
            <option value="all">All Depths</option>
            {depths.map((d) => (
              <option key={d} value={d}>Depth {d}</option>
            ))}
          </select>

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900/60 border border-gray-700/40 rounded-lg text-gray-300 text-xs hover:border-cyan-500/40 transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Export buttons */}
        {jobId && (
          <div className="flex items-center gap-1 flex-wrap">
            <a
              href={`/api/crawl/${jobId}/export?format=xml`}
              download
              className="flex items-center gap-1 px-2.5 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs hover:bg-cyan-500/20 transition-colors"
              title="Download XML Sitemap"
            >
              <FileCode className="w-3.5 h-3.5" /> XML
            </a>
            <a
              href={`/api/crawl/${jobId}/export?format=json`}
              download
              className="flex items-center gap-1 px-2.5 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-xs hover:bg-purple-500/20 transition-colors"
              title="Download JSON"
            >
              <FileJson className="w-3.5 h-3.5" /> JSON
            </a>
            <a
              href={`/api/crawl/${jobId}/export?format=csv`}
              download
              className="flex items-center gap-1 px-2.5 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-xs hover:bg-green-500/20 transition-colors"
              title="Download CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
            </a>
            <a
              href={`/api/crawl/${jobId}/export?format=txt`}
              download
              className="flex items-center gap-1 px-2.5 py-2 bg-gray-500/10 border border-gray-500/30 rounded-lg text-gray-400 text-xs hover:bg-gray-500/20 transition-colors"
              title="Download TXT"
            >
              <FileText className="w-3.5 h-3.5" /> TXT
            </a>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
        Showing {paginated.length} of {filtered.length} results
        {search && ` (filtered from ${urls.length})`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-none sm:rounded-lg border-y sm:border border-gray-700/30 bg-gray-950/60 backdrop-blur-sm">
        <table className="w-full text-xs min-w-[400px]">
          <thead>
            <tr className="border-b border-gray-800/50">
              <th className="text-left py-2.5 px-3 text-gray-500 font-mono font-medium cursor-pointer hover:text-gray-300" onClick={() => toggleSort('url')}>
                URL {sortField === 'url' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center py-2.5 px-2 text-gray-500 font-mono font-medium cursor-pointer hover:text-gray-300 w-14 sm:w-16" onClick={() => toggleSort('statusCode')}>
                Status {sortField === 'statusCode' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left py-2.5 px-2 text-gray-500 font-mono font-medium w-48 hidden lg:table-cell">Title</th>
              <th className="text-center py-2.5 px-2 text-gray-500 font-mono font-medium cursor-pointer hover:text-gray-300 w-14 sm:w-16 hidden sm:table-cell" onClick={() => toggleSort('depth')}>
                Depth {sortField === 'depth' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center py-2.5 px-2 text-gray-500 font-mono font-medium w-20 hidden md:table-cell">Type</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-600 font-mono">
                  <Download className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No results found
                </td>
              </tr>
            ) : (
              paginated.map((u, i) => (
                <motion.tr
                  key={u.url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className="border-b border-gray-800/20 hover:bg-gray-800/20 transition-colors group"
                >
                  <td className="py-2 px-3 font-mono text-gray-300">
                    <div className="flex items-center gap-1.5 max-w-[180px] sm:max-w-md">
                      <span className="truncate text-[11px] sm:text-xs">{u.url}</span>
                      <a href={u.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </a>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">{statusBadge(u)}</td>
                  <td className="py-2 px-2 text-gray-500 truncate max-w-[12rem] hidden lg:table-cell">{u.title || '—'}</td>
                  <td className="py-2 px-2 text-center text-gray-500 font-mono hidden sm:table-cell">{u.depth}</td>
                  <td className="py-2 px-2 text-center text-gray-600 text-[10px] font-mono hidden md:table-cell">
                    {u.contentType ? u.contentType.split(';')[0].split('/').pop() : '—'}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded bg-gray-800/60 border border-gray-700/30 text-gray-400 text-xs disabled:opacity-30 hover:border-cyan-500/30 transition-colors"
          >
            Prev
          </button>
          <span className="text-xs font-mono text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded bg-gray-800/60 border border-gray-700/30 text-gray-400 text-xs disabled:opacity-30 hover:border-cyan-500/30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
