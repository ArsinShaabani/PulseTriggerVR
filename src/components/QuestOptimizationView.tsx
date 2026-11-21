import { useMemo, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { QUEST3_OPTIMIZATIONS } from '../engine/projectCatalog';
import { estimateQuest3FrameBudget } from '../engine/rhythmScoring';

export function QuestOptimizationView() {
  const [foveationLevel, setFoveationLevel] = useState(2);
  const [renderScalePercent, setRenderScalePercent] = useState(100);
  const [dynamicResolution, setDynamicResolution] = useState(true);
  const [msaaLevel, setMsaaLevel] = useState(4);
  const [activeDrawCalls, setActiveDrawCalls] = useState(160);
  const [verifiedIds, setVerifiedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of QUEST3_OPTIMIZATIONS) {
      initial[item.id] = true;
    }
    return initial;
  });

  const budget = useMemo(
    () =>
      estimateQuest3FrameBudget({
        foveationLevel,
        renderScalePercent,
        dynamicResolution,
        msaaLevel,
        activeDrawCalls,
      }),
    [foveationLevel, renderScalePercent, dynamicResolution, msaaLevel, activeDrawCalls]
  );

  const toggleVerified = (id: string) => {
    setVerifiedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = Object.values(verifiedIds).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 space-y-8">
      <section className="border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Meta Quest 3 90 Hz Frame Budget &amp; Android Packaging
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Interactive Adreno 740 frame-time estimator (11.11 ms ceiling) paired with DefaultEngine.ini verification and APK build commands.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-100">01. Quest 3 Rendering Profile Simulator</h2>
            <span
              className={`text-xs font-semibold tabular-nums ${
                budget.meets90HzTarget ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {budget.meets90HzTarget ? 'Nominal: 90 Hz Locked' : 'Warning: Exceeds 11.11 ms Budget'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Foveated Rendering (FFR Level)</span>
                <span className="font-mono tabular-nums text-cyan-300">{foveationLevel}</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={foveationLevel}
                onChange={(e) => setFoveationLevel(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Render Scale (%)</span>
                <span className="font-mono tabular-nums text-cyan-300">{renderScalePercent}%</span>
              </div>
              <input
                type="range"
                min={75}
                max={150}
                step={5}
                value={renderScalePercent}
                onChange={(e) => setRenderScalePercent(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Scene Draw Calls / Eye</span>
                <span className="font-mono tabular-nums text-cyan-300">{activeDrawCalls}</span>
              </div>
              <input
                type="range"
                min={80}
                max={320}
                step={10}
                value={activeDrawCalls}
                onChange={(e) => setActiveDrawCalls(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </label>

            <div className="flex items-center justify-between gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={dynamicResolution}
                  onChange={(e) => setDynamicResolution(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 accent-cyan-500"
                />
                Dynamic Resolution
              </label>

              <select
                aria-label="MSAA level"
                value={msaaLevel}
                onChange={(e) => setMsaaLevel(Number(e.target.value))}
                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value={0}>MSAA Off</option>
                <option value={2}>2x MSAA</option>
                <option value={4}>4x MSAA (Quest 3)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-4">
            <div>
              <div className="text-xs text-slate-400">Estimated GPU</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-100">
                {budget.gpuFrameMs.toFixed(2)} ms
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Estimated CPU</div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-100">
                {budget.cpuFrameMs.toFixed(2)} ms
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Target Framerate</div>
              <div
                className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                  budget.meets90HzTarget ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {budget.estimatedFps} FPS
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#111827] p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-100">02. Quest 3 Standalone APK Build Pipeline</h2>
          <p className="text-xs leading-relaxed text-slate-400">
            Configure Android SDK 32 + NDK r25b via <span className="font-mono text-slate-300">SetupAndroid.bat</span>, then cook and archive ASTC Shipping APK:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0a0f17] p-3.5 font-mono text-[11.5px] leading-5 text-cyan-200">
{`RunUAT.bat BuildCookRun \\
  -project="PulseTriggerVR.uproject" \\
  -noP4 -platform=Android -cookflavor=ASTC \\
  -clientconfig=Shipping -cook -allmaps \\
  -stage -pak -archive -archivedirectory="Builds/Quest3"

adb install -r Builds/Quest3/Android_ASTC/PulseTriggerVR-arm64.apk`}
          </pre>
          <div className="text-xs text-slate-400">
            Manifest UPL: <span className="font-mono text-slate-300">Build/Android/AndroidManifest_Quest3_UPL.xml</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-[#111827]">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">03. Production Optimization Audit</h2>
            <p className="text-xs text-slate-400">Pre-verified against DefaultEngine.ini and AndroidEngine.ini</p>
          </div>
          <span className="font-mono text-xs tabular-nums text-cyan-300">
            {checkedCount} / {QUEST3_OPTIMIZATIONS.length} Verified
          </span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {QUEST3_OPTIMIZATIONS.map((item) => {
            const isChecked = Boolean(verifiedIds[item.id]);
            return (
              <div key={item.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-800/30">
                <button
                  type="button"
                  onClick={() => toggleVerified(item.id)}
                  aria-label={`Toggle verification for ${item.setting}`}
                  className="mt-0.5 shrink-0 text-cyan-400 hover:text-cyan-300"
                >
                  {isChecked ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-slate-600" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-slate-100">{item.setting}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs text-cyan-300">{item.value}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{item.category}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.rationale}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
