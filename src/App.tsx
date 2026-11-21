import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { loadProjectFiles } from './engine/projectCatalog';
import { SourceExplorerView } from './components/SourceExplorerView';
import { ArchitectureView } from './components/ArchitectureView';
import { QuestOptimizationView } from './components/QuestOptimizationView';
import { RhythmSandboxView } from './components/RhythmSandboxView';

type StudioTab = 'explorer' | 'architecture' | 'quest3' | 'sandbox';

export default function App() {
  const autoStartFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [activeTab, setActiveTab] = useState<StudioTab>(() => (autoStartFromUrl ? 'sandbox' : 'explorer'));
  const projectFiles = useMemo(() => loadProjectFiles(), []);

  const handleExportBundle = () => {
    const bundlePayload = {
      project: 'PulseTriggerVR',
      engine: 'Unreal Engine 5.4+',
      target: 'Meta Quest 3 Standalone OpenXR 90Hz',
      fileCount: projectFiles.length,
      files: projectFiles.map((f) => ({ path: f.path, category: f.category, content: f.content })),
    };

    const blob = new Blob([JSON.stringify(bundlePayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'PulseTriggerVR-UE5-Project.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (activeTab === 'sandbox') {
    return (
      <RhythmSandboxView
        autoStart={autoStartFromUrl}
        onExitToStudio={() => setActiveTab('explorer')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100">
      <header className="border-b border-slate-800/90 bg-[#0d131d]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('explorer');
            }}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Pulse Trigger UE5
          </a>

          <nav className="flex items-center gap-6 text-sm font-medium" aria-label="Primary studio sections">
            <button
              type="button"
              onClick={() => setActiveTab('explorer')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'explorer' ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Source Explorer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'architecture' ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quest3')}
              className={`whitespace-nowrap shrink-0 transition-colors ${
                activeTab === 'quest3' ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Quest 3 90Hz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sandbox')}
              className="whitespace-nowrap shrink-0 text-slate-400 hover:text-cyan-300 transition-colors"
            >
              Playable Sandbox
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleExportBundle}
              className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export Project
            </button>
          </div>
        </div>
      </header>

      <main>
        {activeTab === 'explorer' && <SourceExplorerView files={projectFiles} />}
        {activeTab === 'architecture' && (
          <ArchitectureView onOpenFileHint={() => setActiveTab('explorer')} />
        )}
        {activeTab === 'quest3' && <QuestOptimizationView />}
      </main>
    </div>
  );
}
