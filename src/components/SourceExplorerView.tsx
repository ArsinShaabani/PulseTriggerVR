import { useMemo, useState } from 'react';
import { Check, Copy, FileCode2, FolderOpen, Search } from 'lucide-react';
import type { ProjectFileEntry } from '../engine/projectCatalog';

interface SourceExplorerViewProps {
  files: ProjectFileEntry[];
}

const CATEGORIES: Array<'All' | ProjectFileEntry['category']> = [
  'All',
  'Core',
  'Rhythm',
  'VR',
  'Weapons',
  'AI',
  'Level',
  'Systems',
  'UI',
  'Config',
  'Build',
  'Docs',
];

export function SourceExplorerView({ files }: SourceExplorerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProjectFileEntry['category']>('All');
  const [selectedPath, setSelectedPath] = useState<string>(() => {
    const preferred = files.find((f) => f.name === 'BeatManagerSubsystem.cpp');
    return preferred?.path ?? files[0]?.path ?? '';
  });
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      if (selectedCategory !== 'All' && file.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        file.path.toLowerCase().includes(q) ||
        file.name.toLowerCase().includes(q) ||
        file.content.toLowerCase().includes(q)
      );
    });
  }, [files, searchQuery, selectedCategory]);

  const activeFile = useMemo(() => {
    return files.find((f) => f.path === selectedPath) ?? filteredFiles[0] ?? null;
  }, [files, selectedPath, filteredFiles]);

  const codeLines = useMemo(() => {
    return activeFile ? activeFile.content.split('\n') : [];
  }, [activeFile]);

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedPath(activeFile.path);
      window.setTimeout(() => setCopiedPath(null), 1600);
    } catch {
      // Clipboard blocked in non-HTTPS context
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Unreal Engine 5.4+ C++ &amp; Config Source Tree
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {files.length} production files targeting Meta Quest 3 OpenXR 90 Hz standalone Android APK.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files or C++ symbols..."
              aria-label="Search UE5 project files"
              className="w-full rounded-lg border border-slate-800 bg-[#111827] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-slate-800/80 pb-3" role="tablist" aria-label="Module filter">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedCategory(category)}
              className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 border border-transparent hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex h-[680px] min-w-0 flex-col rounded-xl border border-slate-800 bg-[#111827]">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-cyan-400" />
              Project Files
            </span>
            <span className="tabular-nums text-slate-400">{filteredFiles.length} shown</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredFiles.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <p className="text-sm font-medium text-slate-300">No matching files</p>
                <p className="mt-1 text-xs text-slate-500">
                  Clear the search query or switch module filter to view all files.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-3 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {filteredFiles.map((file) => {
                  const isSelected = activeFile?.path === file.path;
                  return (
                    <li key={file.path}>
                      <button
                        type="button"
                        onClick={() => setSelectedPath(file.path)}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/15 text-cyan-200'
                            : 'text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                            <span className="truncate text-xs font-medium">{file.name}</span>
                          </div>
                          <div className="mt-0.5 truncate pl-5 text-[11px] text-slate-500">
                            {file.folder}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
                          {file.lines}L
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex h-[680px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0d131d]">
          {activeFile ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#111827] px-5 py-3 rounded-t-xl">
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-medium text-slate-100">
                    PulseTriggerVR/{activeFile.path}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span>{activeFile.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{activeFile.lines} lines</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{(activeFile.bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-700 transition-colors"
                >
                  {copiedPath === activeFile.path ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      Copy File
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 font-mono text-[12.5px] leading-6 text-slate-200">
                <table className="w-full border-collapse">
                  <tbody>
                    {codeLines.map((line, index) => (
                      <tr key={index} className="hover:bg-slate-800/35">
                        <td className="w-12 select-none pr-4 text-right text-slate-600 tabular-nums align-top">
                          {index + 1}
                        </td>
                        <td className="whitespace-pre text-slate-200">{line || ' '}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Select a file from the left tree to inspect its implementation.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
