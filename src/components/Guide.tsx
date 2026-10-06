import React from 'react';
import { BookOpen, ShieldCheck, FileSpreadsheet, Terminal, Cpu, Info } from 'lucide-react';

export const Guide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
        <div>
          <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Documentation & How It Works
          </h2>
          <p className="text-xs text-slate-400">
            Technical architecture, link parsing mechanics, and export file formats.
          </p>
        </div>

        {/* Section 1 */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            How Verification Works
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            When an invite link (such as <code className="text-emerald-400">https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt</code>) is generated, WhatsApp serves a lightweight preview landing page:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0c1317] border border-emerald-950 p-3.5 rounded-xl space-y-1.5">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Valid & Active Group
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                WhatsApp populates the <code className="text-slate-300">og:title</code> with the real group title, renders a custom group photo via <code className="text-slate-300">pps.whatsapp.net</code>, and sets <code className="text-slate-300">invite_link_type_v2 = REGULAR</code>.
              </p>
            </div>

            <div className="bg-[#0c1317] border border-rose-950 p-3.5 rounded-xl space-y-1.5">
              <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Revoked or Reset Link
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                When an administrator clicks <em>"Reset link"</em> or the group is deleted, WhatsApp leaves <code className="text-slate-300">og:title</code> empty, serves the fallback placeholder image, and presents a reset notice.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Output Files */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Export File Formats
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            This web tool replicates and enhances the output report structure of Wajahat Ali Mir's original Python script:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0c1317] border border-slate-800 p-3 rounded-xl">
              <span className="font-mono text-emerald-400 font-semibold">working_links.txt</span>
              <p className="text-slate-400 text-[11px] mt-1">
                Plain text file containing only verified, active group invite URLs ready for batch import into bots or messaging tools.
              </p>
            </div>

            <div className="bg-[#0c1317] border border-slate-800 p-3 rounded-xl">
              <span className="font-mono text-rose-400 font-semibold">dead_links.txt</span>
              <p className="text-slate-400 text-[11px] mt-1">
                Plain text file listing all revoked, reset, or non-existent invite links that should be pruned from your databases.
              </p>
            </div>

            <div className="bg-[#0c1317] border border-slate-800 p-3 rounded-xl">
              <span className="font-mono text-slate-300 font-semibold">ou.csv</span>
              <p className="text-slate-400 text-[11px] mt-1">
                Complete spreadsheet audit containing URL, status, extracted group title, response latency in ms, and check timestamp.
              </p>
            </div>

            <div className="bg-[#0c1317] border border-slate-800 p-3 rounded-xl">
              <span className="font-mono text-slate-300 font-semibold">report.json</span>
              <p className="text-slate-400 text-[11px] mt-1">
                Structured machine-readable JSON report with total counts, active count, dead count, and individual link breakdown.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Safe batch scanning tips */}
        <div className="space-y-2 pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Batch Scanning Best Practices
          </h3>
          <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
            <li>Keep concurrency between 3 and 5 threads for optimal speed without triggering IP rate limits.</li>
            <li>Use 100ms – 250ms delay between consecutive requests when scanning large lists (&gt;100 links).</li>
            <li>Channels (<code className="text-slate-300">whatsapp.com/channel/...</code>) and direct chat links (<code className="text-slate-300">wa.me/...</code>) are automatically categorized and flagged.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
