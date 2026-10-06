import React, { useState } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Shield,
  Code,
  Sparkles,
} from 'lucide-react';
import { CheckResult } from '../types';

interface SingleInspectorProps {
  initialUrl?: string;
}

export const SingleInspector: React.FC<SingleInspectorProps> = ({
  initialUrl = 'https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt',
}) => {
  const [url, setUrl] = useState<string>(initialUrl);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showRaw, setShowRaw] = useState<boolean>(false);

  const handleInspect = async (checkUrl?: string) => {
    const target = (checkUrl || url).trim();
    if (!target) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/check-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });

      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      }
    } catch {
      setResult({
        id: 'err_inspect',
        url: target,
        inviteCode: '',
        status: 'ERROR',
        statusText: 'Failed to connect to inspection service',
        title: null,
        description: null,
        image: null,
        statusCode: 500,
        latencyMs: 0,
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copyCode = () => {
    if (!result?.inviteCode) return;
    navigator.clipboard.writeText(result.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Input Box */}
      <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            Single Link Deep Inspector
          </h2>
          <p className="text-xs text-slate-400">
            Analyze any WhatsApp invite link, preview the group card, and inspect OpenGraph metadata.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
              placeholder="Enter invite link (e.g. https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt)"
              className="w-full bg-[#0c1317] border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-200 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <button
            onClick={() => handleInspect()}
            disabled={loading || !url.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Inspect Link</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Test Links */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs text-slate-400">
          <span className="text-[11px] text-slate-500">Quick tests:</span>
          <button
            onClick={() => {
              const test = 'https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt';
              setUrl(test);
              handleInspect(test);
            }}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            Active Group (Programmers)
          </button>
          <span>·</span>
          <button
            onClick={() => {
              const test = 'https://chat.whatsapp.com/BtbXYGSqn79J2MMMHg333';
              setUrl(test);
              handleInspect(test);
            }}
            className="text-[11px] text-rose-400 hover:text-rose-300 underline underline-offset-2"
          >
            Revoked Group Invite
          </button>
          <span>·</span>
          <button
            onClick={() => {
              const test = 'https://whatsapp.com/channel/0029Va4K8740rGoDqN2v1w2L';
              setUrl(test);
              handleInspect(test);
            }}
            className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            Channel Link
          </button>
        </div>
      </div>

      {/* Inspection Results View */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: WhatsApp-Styled Mobile Card Preview */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm bg-[#111b21] border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-4">
              <div className="text-[10px] font-mono tracking-wider uppercase text-slate-500">
                WhatsApp Invite Preview
              </div>

              {/* Group Avatar */}
              <div className="relative">
                {result.image ? (
                  <img
                    src={result.image}
                    alt={result.title || 'Group'}
                    className="w-24 h-24 rounded-full object-cover border-2 border-emerald-500/40 shadow-xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500">
                    <Shield className="w-10 h-10" />
                  </div>
                )}
                {result.status === 'ACTIVE' && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#111b21] flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
                {result.status === 'REVOKED' && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-rose-500 border-2 border-[#111b21] flex items-center justify-center text-white">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Group Name */}
              <div className="space-y-1">
                <h3 className="font-bold text-slate-100 text-lg leading-tight">
                  {result.title || (result.status === 'ACTIVE' ? 'Unnamed Group' : 'Group Unavailable')}
                </h3>
                <p className="text-xs text-slate-400">
                  {result.description || result.statusText}
                </p>
              </div>

              {/* Action Button */}
              {result.status === 'ACTIVE' ? (
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
                >
                  <span>Join Chat</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 text-center">
                  Cannot Join: Invite Reset or Revoked
                </div>
              )}

              {/* Status Pill in Card */}
              <div className="text-[11px] text-slate-500 font-mono">
                Code: {result.inviteCode || 'N/A'}
              </div>
            </div>
          </div>

          {/* Right Column: Diagnostic & Metadata Breakdown */}
          <div className="md:col-span-7 space-y-4">
            <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  {result.status === 'ACTIVE' && (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Active Group Invite</span>
                    </div>
                  )}
                  {result.status === 'REVOKED' && (
                    <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-sm">
                      <XCircle className="w-4 h-4" />
                      <span>Revoked or Expired</span>
                    </div>
                  )}
                  {result.status !== 'ACTIVE' && result.status !== 'REVOKED' && (
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{result.status}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {result.latencyMs}ms
                  </span>
                  <span>HTTP {result.statusCode}</span>
                </div>
              </div>

              {/* Explanatory banner */}
              <div className="text-xs text-slate-300 bg-[#0c1317] p-3 rounded-xl border border-slate-800">
                {result.statusText}
              </div>

              {/* Key metadata grid */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Invite Code:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-slate-200">{result.inviteCode || 'None'}</span>
                    {result.inviteCode && (
                      <button
                        onClick={copyCode}
                        className="text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Copy code"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Normalized Link:</span>
                  <div className="flex items-center gap-1.5 max-w-xs truncate">
                    <span className="font-mono text-slate-200 truncate">{result.url}</span>
                    <button
                      onClick={copyUrl}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Group Name:</span>
                  <span className="text-slate-200 font-medium">{result.title || 'None / Not exposed'}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                  <span className="text-slate-400">Avatar Image:</span>
                  <span className="text-slate-200 truncate max-w-xs font-mono text-[11px]">
                    {result.image ? 'Custom Group Photo' : 'Default / None'}
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Checked At:</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date(result.checkedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Raw JSON toggle */}
              <div className="pt-2">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showRaw ? 'Hide Raw JSON Response' : 'View Raw JSON Response'}</span>
                </button>

                {showRaw && (
                  <pre className="mt-2 bg-[#0c1317] p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
