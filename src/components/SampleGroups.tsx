import React from 'react';
import { Sparkles, CheckCircle, XCircle, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';

interface SampleGroupsProps {
  onSelectSample: (url: string) => void;
  onLoadAllSamples: (urls: string[]) => void;
}

export const SampleGroups: React.FC<SampleGroupsProps> = ({
  onSelectSample,
  onLoadAllSamples,
}) => {
  const sampleItems = [
    {
      url: 'https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt',
      title: 'NewBee 🐝 Programmer',
      type: 'ACTIVE',
      badge: 'Active & Verified',
      badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
      description: 'Active public programming community group with full metadata and avatar photo.',
    },
    {
      url: 'https://chat.whatsapp.com/BtbXYGSqn79J2MMMHg333',
      title: 'Revoked Link (From Repo)',
      type: 'REVOKED',
      badge: 'Reset / Revoked',
      badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
      description: 'Invite code was reset by group administrator. Shows WhatsApp reset notice.',
    },
    {
      url: 'https://chat.whatsapp.com/H41k9qCj6212h1x8G76h99',
      title: 'Dead / Non-Existent Group',
      type: 'REVOKED',
      badge: 'Expired / Dead',
      badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
      description: 'Non-existent or closed group invite link without any group metadata.',
    },
    {
      url: 'https://chat.whatsapp.com/invite/nonexistent1234567890',
      title: 'Legacy /invite/ Path',
      type: 'REVOKED',
      badge: 'Expired Path',
      badgeColor: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
      description: 'Tests link format with /invite/ subpath that has expired.',
    },
    {
      url: 'https://whatsapp.com/channel/0029Va4K8740rGoDqN2v1w2L',
      title: 'WhatsApp Channel (Not Group)',
      type: 'CHANNEL',
      badge: 'Channel Link',
      badgeColor: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
      description: 'WhatsApp broadcast channel link. Detected separately from group chats.',
    },
    {
      url: 'https://chat.whatsapp.com/INVALID_SHORT',
      title: 'Malformed Short Code',
      type: 'INVALID',
      badge: 'Invalid Format',
      badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
      description: 'Contains only 13 characters. Real WhatsApp invite codes are 20-24 characters.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Pre-Configured Test Links
            </h2>
            <p className="text-xs text-slate-400">
              Test and verify the checker immediately using curated links across all test states.
            </p>
          </div>

          <button
            onClick={() => onLoadAllSamples(sampleItems.map((s) => s.url))}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-colors"
          >
            <span>Load All into Batch Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid of sample cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {sampleItems.map((sample, idx) => (
            <div
              key={idx}
              className="bg-[#0c1317] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200 text-sm">{sample.title}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${sample.badgeColor}`}
                  >
                    {sample.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{sample.description}</p>

                <div className="bg-[#111b21] p-2 rounded-lg font-mono text-[11px] text-slate-300 break-all select-all">
                  {sample.url}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between mt-3">
                <button
                  onClick={() => onSelectSample(sample.url)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  <span>Inspect this</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <a
                  href={sample.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                >
                  <span>Open in WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
