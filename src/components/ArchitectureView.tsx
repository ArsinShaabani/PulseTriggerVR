import { BLUEPRINT_HIERARCHY, DESIGN_PATTERNS } from '../engine/projectCatalog';

interface ArchitectureViewProps {
  onOpenFileHint?: () => void;
}

export function ArchitectureView({ onOpenFileHint }: ArchitectureViewProps) {
  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 space-y-10">
      <section className="flex flex-col gap-3 border-b border-slate-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            AAA Gameplay Architecture &amp; Blueprint Hierarchy
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">
            Data-driven Unreal Engine 5.4 C++ subsystem foundation paired with thin Designer Blueprints and Data Assets.
          </p>
        </div>
        {onOpenFileHint && (
          <button
            type="button"
            onClick={onOpenFileHint}
            className="whitespace-nowrap shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Inspect C++ Files
          </button>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-100">01. Blueprint Inheritance &amp; Data Asset Pipeline</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Designers author levels, enemy archetypes, and weapon feel entirely in Data Assets without touching C++.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BLUEPRINT_HIERARCHY.map((bp) => (
            <article
              key={bp.blueprintName}
              className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111827] p-5"
            >
              <div>
                <div className="text-xs text-slate-400">
                  <span>{bp.module}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono text-cyan-400">{bp.parentCppClass}</span>
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-slate-100">{bp.blueprintName}</h3>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                  {bp.responsibilities.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-cyan-400">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                <span className="text-slate-500">Data Assets: </span>
                <span className="font-mono text-slate-300">{bp.dataAssets.join(' · ')}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-100">02. SOLID &amp; Production Design Patterns</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Decoupled subsystems enforce clean ownership, zero runtime allocations, and deterministic frame budgets.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-xs font-medium text-slate-400">
              <tr>
                <th className="px-5 py-3">Pattern</th>
                <th className="px-5 py-3">UE5 C++ Implementation</th>
                <th className="px-5 py-3">Production Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {DESIGN_PATTERNS.map((row) => (
                <tr key={row.pattern} className="hover:bg-slate-800/35">
                  <td className="px-5 py-3.5 font-medium text-slate-100 whitespace-nowrap">{row.pattern}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-cyan-300">{row.implementation}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-300">{row.benefit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
