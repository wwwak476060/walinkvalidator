import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Upload,
  Download,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  FileText,
  Sliders,
  Grid,
  List,
  Search,
  Trash2,
  Share2,
} from 'lucide-react';
import { CheckResult, BatchStats } from '../types';
import {
  exportWorkingLinks,
  exportDeadLinks,
  exportCsvReport,
  exportJsonReport,
} from '../utils/export';

interface BatchScannerProps {
  inputText: string;
  setInputText: (text: string) => void;
  onInspectLink: (url: string) => void;
  onStatsChange?: (active: number, total: number) => void;
}

export const BatchScanner: React.FC<BatchScannerProps> = ({
  inputText,
  setInputText,
  onInspectLink,
  onStatsChange,
}) => {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [concurrency, setConcurrency] = useState<number>(3);
  const [delayMs, setDelayMs] = useState<number>(100);
  const [deduplicate, setDeduplicate] = useState<boolean>(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED' | 'INVALID'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWorking, setCopiedWorking] = useState<boolean>(false);

  useEffect(() => {
    if (onStatsChange) {
      const active = results.filter((r) => r.status === 'ACTIVE').length;
      onStatsChange(active, results.length);
    }
  }, [results, onStatsChange]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse links from input textarea
  const getParsedLinks = (): string[] => {
    const rawLines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let links: string[] = [];
    for (const line of rawLines) {
      // Find chat.whatsapp.com links even inside strings
      const matches = line.match(/(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?[a-zA-Z0-9_-]+/gi);
      if (matches) {
        links.push(...matches.map((m) => (m.startsWith('http') ? m : `https://${m}`)));
      } else if (line.includes('whatsapp.com')) {
        links.push(line.startsWith('http') ? line : `https://${line}`);
      } else if (line.length >= 15) {
        // Assume raw invite code or link
        links.push(line.startsWith('http') ? line : `https://chat.whatsapp.com/${line}`);
      }
    }

    if (deduplicate) {
      links = Array.from(new Set(links));
    }
    return links;
  };

  // Start checking
  const handleStartScan = async () => {
    const targetLinks = getParsedLinks();
    if (targetLinks.length === 0) return;

    setIsScanning(true);
    setResults([]);
    setProgress({ current: 0, total: targetLinks.length });

    abortControllerRef.current = new AbortController();

    const checkedItems: CheckResult[] = [];
    let currentIndex = 0;

    // Worker function for concurrency
    async function worker() {
      while (currentIndex < targetLinks.length) {
        if (abortControllerRef.current?.signal.aborted) break;

        const index = currentIndex++;
        const targetUrl = targetLinks[index];

        try {
          const res = await fetch('/api/check-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl }),
            signal: abortControllerRef.current?.signal,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.result) {
              checkedItems.push(data.result);
              setResults([...checkedItems]);
            }
          } else {
            // Fallback error record
            const errorRecord: CheckResult = {
              id: `err_${Date.now()}_${index}`,
              url: targetUrl,
              inviteCode: '',
              status: 'ERROR',
              statusText: `HTTP Error ${res.status}`,
              title: null,
              description: null,
              image: null,
              statusCode: res.status,
              latencyMs: 0,
              checkedAt: new Date().toISOString(),
            };
            checkedItems.push(errorRecord);
            setResults([...checkedItems]);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            break;
          }
          const errorRecord: CheckResult = {
            id: `err_${Date.now()}_${index}`,
            url: targetUrl,
            inviteCode: '',
            status: 'ERROR',
            statusText: 'Network / Check Failed',
            title: null,
            description: null,
            image: null,
            statusCode: 500,
            latencyMs: 0,
            checkedAt: new Date().toISOString(),
          };
          checkedItems.push(errorRecord);
          setResults([...checkedItems]);
        }

        setProgress({ current: checkedItems.length, total: targetLinks.length });

        if (delayMs > 0 && currentIndex < targetLinks.length) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    const workerCount = Math.min(concurrency, targetLinks.length);
    const workers = Array.from({ length: workerCount }, () => worker());

    await Promise.all(workers);
    setIsScanning(false);
  };

  const handleStopScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
  };

  // Handle file upload (.txt or .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Copy single link
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy all active links
  const copyAllWorking = () => {
    const working = results
      .filter((r) => r.status === 'ACTIVE')
      .map((r) => r.url)
      .join('\n');
    if (!working) return;
    navigator.clipboard.writeText(working);
    setCopiedWorking(true);
    setTimeout(() => setCopiedWorking(false), 2000);
  };

  // Stats calculation
  const stats: BatchStats = {
    total: results.length,
    active: results.filter((r) => r.status === 'ACTIVE').length,
    revoked: results.filter((r) => r.status === 'REVOKED').length,
    invalid: results.filter(
      (r) => r.status === 'INVALID_FORMAT' || r.status === 'CHANNEL' || r.status === 'DIRECT'
    ).length,
    errors: results.filter((r) => r.status === 'ERROR' || r.status === 'RATE_LIMITED').length,
  };

  // Filtered results
  const filteredResults = results.filter((item) => {
    // Status filter
    if (filter === 'ACTIVE' && item.status !== 'ACTIVE') return false;
    if (filter === 'REVOKED' && item.status !== 'REVOKED') return false;
    if (
      filter === 'INVALID' &&
      item.status !== 'INVALID_FORMAT' &&
      item.status !== 'CHANNEL' &&
      item.status !== 'DIRECT' &&
      item.status !== 'ERROR'
    )
      return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchUrl = item.url.toLowerCase().includes(q);
      const matchCode = item.inviteCode.toLowerCase().includes(q);
      return matchTitle || matchUrl || matchCode;
    }
    return true;
  });

  const parsedCount = getParsedLinks().length;

  return (
    <div className="space-y-6">
      {/* Top Configuration & Input Card */}
      <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Batch URL Input & Queue
            </h2>
            <p className="text-xs text-slate-400">
              Paste WhatsApp invite links, drop a <code className="text-emerald-400">groups.txt</code> file, or extract codes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.csv"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              title="Upload TXT or CSV file"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload List</span>
            </button>

            <button
              onClick={() => setInputText('')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Clear input"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isScanning}
            rows={5}
            placeholder="Paste WhatsApp invite links here (one per line)... e.g. https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt"
            className="w-full bg-[#0c1317] border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all resize-y placeholder:text-slate-600 disabled:opacity-50"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-[#111b21]/90 backdrop-blur px-2 py-1 rounded text-[11px] text-slate-400 border border-slate-800">
            <span>{parsedCount} unique link{parsedCount === 1 ? '' : 's'}</span>
          </div>
        </div>

        {/* Settings Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Deduplicate Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deduplicate}
              onChange={(e) => setDeduplicate(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0"
            />
            <span>Auto-deduplicate duplicate links</span>
          </label>

          {/* Concurrency Slider */}
          <div className="flex items-center gap-3">
            <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Concurrency</span>
                <span className="font-mono text-emerald-400">{concurrency} threads</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={concurrency}
                onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Delay Slider */}
          <div className="flex items-center gap-3">
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Request Delay</span>
                <span className="font-mono text-emerald-400">{delayMs} ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {!isScanning ? (
              <button
                onClick={handleStartScan}
                disabled={parsedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Checking ({parsedCount})</span>
              </button>
            ) : (
              <button
                onClick={handleStopScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Check</span>
              </button>
            )}

            {results.length > 0 && !isScanning && (
              <button
                onClick={() => setResults([])}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                Reset Results
              </button>
            )}
          </div>

          {/* Quick Exports */}
          {results.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={copyAllWorking}
                disabled={stats.active === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/40 transition-colors disabled:opacity-40"
              >
                {copiedWorking ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWorking ? 'Copied!' : `Copy Active (${stats.active})`}</span>
              </button>

              <div className="relative group">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 bottom-full mb-1 w-44 bg-[#111b21] border border-slate-800 rounded-xl shadow-2xl p-1.5 hidden group-hover:block z-20">
                  <button
                    onClick={() => exportWorkingLinks(results)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-950/50 transition-colors"
                  >
                    working_links.txt
                  </button>
                  <button
                    onClick={() => exportDeadLinks(results)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/50 transition-colors"
                  >
                    dead_links.txt
                  </button>
                  <button
                    onClick={() => exportCsvReport(results)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    ou.csv (Full Report)
                  </button>
                  <button
                    onClick={() => exportJsonReport(results)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    report.json
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isScanning && (
          <div className="pt-2 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Scanning in progress...
              </span>
              <span className="font-mono text-emerald-400">
                {progress.current} / {progress.total} (
                {Math.round((progress.current / (progress.total || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{
                  width: `${Math.round((progress.current / (progress.total || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Metrics Counters Bar */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#111b21] border border-slate-800/80 rounded-xl p-3 sm:p-4">
            <span className="text-xs text-slate-400 font-medium">Total Scanned</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-100">{stats.total}</span>
              <span className="text-[11px] text-slate-500">links</span>
            </div>
          </div>

          <div className="bg-[#111b21] border border-emerald-900/30 rounded-xl p-3 sm:p-4">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Active / Working
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-400">{stats.active}</span>
              <span className="text-[11px] text-emerald-500/70">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-[#111b21] border border-rose-900/30 rounded-xl p-3 sm:p-4">
            <span className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              Revoked / Dead
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-400">{stats.revoked}</span>
              <span className="text-[11px] text-rose-500/70">
                {stats.total > 0 ? Math.round((stats.revoked / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>

          <div className="bg-[#111b21] border border-amber-900/30 rounded-xl p-3 sm:p-4">
            <span className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Invalid / Formats
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400">{stats.invalid + stats.errors}</span>
              <span className="text-[11px] text-amber-500/70">links</span>
            </div>
          </div>
        </div>
      )}

      {/* Results Filter & View Bar */}
      {results.length > 0 && (
        <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 p-1 bg-[#0c1317] rounded-xl border border-slate-800">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setFilter('ACTIVE')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Active ({stats.active})
              </button>
              <button
                onClick={() => setFilter('REVOKED')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === 'REVOKED'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                Revoked ({stats.revoked})
              </button>
              <button
                onClick={() => setFilter('INVALID')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filter === 'INVALID'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-amber-400 hover:text-amber-300'
                }`}
              >
                Invalid ({stats.invalid + stats.errors})
              </button>
            </div>

            {/* Search Input & View Switcher */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by title or code..."
                  className="w-full bg-[#0c1317] border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex items-center bg-[#0c1317] rounded-xl border border-slate-800 p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'table' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Table view"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === 'cards' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Card grid view"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0c1317] text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Group Name & Invite</th>
                    <th className="py-2.5 px-3 font-medium hidden sm:table-cell">Invite Code</th>
                    <th className="py-2.5 px-3 font-medium hidden md:table-cell">Ping</th>
                    <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                        No links matched your current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        {/* Status Column */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.status === 'ACTIVE' && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          )}
                          {item.status === 'REVOKED' && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Revoked
                            </span>
                          )}
                          {item.status === 'CHANNEL' && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-blue-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              Channel
                            </span>
                          )}
                          {(item.status === 'INVALID_FORMAT' || item.status === 'DIRECT') && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Invalid
                            </span>
                          )}
                          {item.status === 'ERROR' && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Error
                            </span>
                          )}
                        </td>

                        {/* Group Name & URL Column */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title || 'Group'}
                                className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-700">
                                <Share2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div className="min-w-0 max-w-xs sm:max-w-md">
                              <div className="font-semibold text-slate-200 truncate">
                                {item.title || (
                                  <span className="text-slate-500 italic">
                                    {item.status === 'ACTIVE' ? 'Unnamed Group' : item.statusText}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">{item.url}</div>
                            </div>
                          </div>
                        </td>

                        {/* Invite Code Column */}
                        <td className="py-3 px-3 font-mono text-slate-300 hidden sm:table-cell">
                          {item.inviteCode || '-'}
                        </td>

                        {/* Ping / Latency Column */}
                        <td className="py-3 px-3 font-mono text-slate-400 hidden md:table-cell">
                          {item.latencyMs > 0 ? `${item.latencyMs}ms` : '-'}
                        </td>

                        {/* Actions Column */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => copyToClipboard(item.url, item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                              title="Copy URL"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              onClick={() => onInspectLink(item.url)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                              title="Inspect link"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>

                            {item.status === 'ACTIVE' && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors"
                                title="Open WhatsApp Group"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredResults.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0c1317] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-700">
                            <Share2 className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-slate-200 text-sm leading-tight line-clamp-1">
                            {item.title || 'Untitled Group'}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {item.latencyMs > 0 ? `${item.latencyMs}ms` : 'Checked'}
                          </span>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {item.status === 'ACTIVE' && (
                          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        )}
                        {item.status === 'REVOKED' && (
                          <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Revoked
                          </span>
                        )}
                        {item.status !== 'ACTIVE' && item.status !== 'REVOKED' && (
                          <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            {item.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {item.description || item.statusText}
                    </p>

                    <div className="bg-[#111b21] p-2 rounded-lg font-mono text-[11px] text-slate-300 break-all select-all">
                      {item.url}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-3">
                    <button
                      onClick={() => onInspectLink(item.url)}
                      className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      Inspect Deep
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(item.url, item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Copy URL"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {item.status === 'ACTIVE' && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        >
                          <span>Join</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
