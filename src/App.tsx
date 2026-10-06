import React, { useState } from 'react';
import { Header } from './components/Header';
import { BatchScanner } from './components/BatchScanner';
import { SingleInspector } from './components/SingleInspector';
import { SampleGroups } from './components/SampleGroups';
import { Guide } from './components/Guide';

export default function App() {
  const [activeTab, setActiveTab] = useState<'batch' | 'single' | 'samples' | 'guide'>('batch');
  const [inspectorUrl, setInspectorUrl] = useState<string>('https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt');
  const [batchText, setBatchText] = useState<string>(
    'https://chat.whatsapp.com/GlQfvc83mSH3F6ov06vuCt\nhttps://chat.whatsapp.com/BtbXYGSqn79J2MMMHg333\nhttps://chat.whatsapp.com/H41k9qCj6212h1x8G76h99\nhttps://whatsapp.com/channel/0029Va4K8740rGoDqN2v1w2L'
  );
  const [stats, setStats] = useState<{ active: number; total: number }>({ active: 0, total: 0 });

  const handleInspectLink = (url: string) => {
    setInspectorUrl(url);
    setActiveTab('single');
  };

  const handleLoadAllSamples = (urls: string[]) => {
    setBatchText(urls.join('\n'));
    setActiveTab('batch');
  };

  return (
    <div className="min-h-screen bg-[#0c1317] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeCount={stats.active}
        totalCount={stats.total}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'batch' && (
          <BatchScanner
            inputText={batchText}
            setInputText={setBatchText}
            onInspectLink={handleInspectLink}
            onStatsChange={(active, total) => setStats({ active, total })}
          />
        )}
        {activeTab === 'single' && (
          <SingleInspector initialUrl={inspectorUrl} key={inspectorUrl} />
        )}
        {activeTab === 'samples' && (
          <SampleGroups
            onSelectSample={handleInspectLink}
            onLoadAllSamples={handleLoadAllSamples}
          />
        )}
        {activeTab === 'guide' && <Guide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#080d10] py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>WhatsApp Group Link Checker & Validator</span>
            <span>·</span>
            <span>Based on Wajahat Ali Mir's Tool</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Server Active</span>
            <span>·</span>
            <span>Fast OpenGraph Protocol</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
