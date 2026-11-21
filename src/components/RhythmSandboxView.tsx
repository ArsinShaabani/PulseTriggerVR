import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  createSandboxState,
  fireSandboxWeapon,
  projectEnemyToNormalizedScreen,
  stepSandboxSimulation,
  triggerSandboxReload,
  type SandboxState,
} from '../engine/sandboxSimulation';
import { computeBeatGridPosition, type PerformanceGrade, type ScoreMetrics } from '../engine/rhythmScoring';
import { synthAudio } from '../engine/synthAudio';

interface RhythmSandboxViewProps {
  autoStart: boolean;
  onExitToStudio: () => void;
}

interface HudSnapshot {
  status: SandboxState['status'];
  health: number;
  maxHealth: number;
  leftAmmo: number;
  rightAmmo: number;
  maxAmmo: number;
  reloading: boolean;
  dualWield: boolean;
  autoReload: boolean;
  score: ScoreMetrics;
  progressPercent: number;
  calloutText: string;
  dodgePosture: 'Center' | 'Lean Left' | 'Lean Right' | 'Duck';
  beatPhase: number;
}

function makeHudSnapshot(sim: SandboxState): HudSnapshot {
  const grid = computeBeatGridPosition(sim.songTimeSec, sim.timingConfig);
  let dodgePosture: HudSnapshot['dodgePosture'] = 'Center';
  if (sim.headCrouchY < -0.18) dodgePosture = 'Duck';
  else if (sim.headOffsetX < -0.18) dodgePosture = 'Lean Left';
  else if (sim.headOffsetX > 0.18) dodgePosture = 'Lean Right';

  return {
    status: sim.status,
    health: sim.playerHealth,
    maxHealth: sim.maxHealth,
    leftAmmo: sim.leftAmmo,
    rightAmmo: sim.rightAmmo,
    maxAmmo: sim.maxAmmo,
    reloading: sim.reloadTimer > 0,
    dualWield: sim.dualWield,
    autoReload: sim.autoReload,
    score: { ...sim.score },
    progressPercent: Math.min(100, Math.round((sim.songTimeSec / sim.trackDurationSec) * 100)),
    calloutText: sim.lastCalloutTimer > 0 ? sim.lastCalloutText : '',
    dodgePosture,
    beatPhase: grid.beatPhaseNormalized,
  };
}

function gradeAccentColor(grade: PerformanceGrade): string {
  switch (grade) {
    case 'S+':
      return '#facc15';
    case 'S':
      return '#22d3ee';
    case 'A':
      return '#34d399';
    case 'B':
      return '#60a5fa';
    case 'C':
      return '#fb923c';
    default:
      return '#f87171';
  }
}

export function RhythmSandboxView({ autoStart, onExitToStudio }: RhythmSandboxViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const beatRingRef = useRef<HTMLDivElement | null>(null);

  const [dualWield, setDualWield] = useState(true);
  const [autoReload, setAutoReload] = useState(false);
  const [muted, setMuted] = useState(false);

  const simRef = useRef<SandboxState>(createSandboxState(true, false));
  const keysRef = useRef<Set<string>>(new Set());
  const aimNormRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const [hud, setHud] = useState<HudSnapshot>(() => makeHudSnapshot(simRef.current));

  const syncDocumentBodyState = useCallback((status: SandboxState['status']) => {
    if (status === 'victory' || status === 'gameover') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = status;
    }
  }, []);

  const startNewRun = useCallback((fromUserGesture = true) => {
    if (fromUserGesture) {
      synthAudio.unlock();
    }
    const fresh = createSandboxState(dualWield, autoReload);
    fresh.status = 'playing';
    simRef.current = fresh;
    keysRef.current.clear();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    syncDocumentBodyState('playing');
    setHud(makeHudSnapshot(fresh));
  }, [dualWield, autoReload, syncDocumentBodyState]);

  const togglePause = useCallback(() => {
    const sim = simRef.current;
    if (sim.status === 'playing') {
      sim.status = 'paused';
      keysRef.current.clear();
      syncDocumentBodyState('paused');
      setHud(makeHudSnapshot(sim));
    } else if (sim.status === 'paused') {
      sim.status = 'playing';
      syncDocumentBodyState('playing');
      setHud(makeHudSnapshot(sim));
    }
  }, [syncDocumentBodyState]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      synthAudio.setMuted(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (autoStart) {
      startNewRun(false);
    } else {
      syncDocumentBodyState(simRef.current.status);
    }
    return () => {
      delete document.body.dataset.state;
    };
  }, [autoStart, startNewRun, syncDocumentBodyState]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      synthAudio.unlock();
      const sim = simRef.current;
      const code = e.code;

      if (sim.status === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        startNewRun();
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (sim.status === 'playing' || sim.status === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (code === 'KeyM') {
        toggleMute();
        return;
      }

      if (code === 'KeyR' && sim.status === 'playing') {
        if (triggerSandboxReload(sim)) {
          synthAudio.playReload();
          setHud(makeHudSnapshot(sim));
        }
        return;
      }

      keysRef.current.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    const clearInputs = () => {
      keysRef.current.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, [startNewRun, togglePause, toggleMute]);

  // Main Canvas2D simulation & render loop (mounted once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let lastStatus = simRef.current.status;
    let cachedBg: CanvasGradient | null = null;
    let cachedH = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(240, Math.floor(rect.height));
      cachedBg = null;
      drawCorridorScene(ctx, canvas.width, canvas.height, simRef.current, aimNormRef.current, cachedBg);
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    let timeoutId = 0;
    let disposed = false;

    const scheduleNext = (drawMs: number) => {
      if (disposed) return;
      if (drawMs > 12) {
        timeoutId = window.setTimeout(() => {
          if (!disposed) animId = requestAnimationFrame(frame);
        }, 16);
      } else {
        animId = requestAnimationFrame(frame);
      }
    };

    const frame = (now: number) => {
      if (disposed) return;
      const startMs = performance.now();
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const sim = simRef.current;

      if (sim.status === 'playing') {
        const keys = keysRef.current;
        const leanLeft = keys.has('KeyA') || keys.has('ArrowLeft');
        const leanRight = keys.has('KeyD') || keys.has('ArrowRight');
        const crouch = keys.has('KeyS') || keys.has('ArrowDown');

        stepSandboxSimulation(sim, rawDt, { leanLeft, leanRight, crouch }, {
          onBeat: (sixteenthIdx) => synthAudio.playBeatPulse(sixteenthIdx),
          onPerfectDodge: () => synthAudio.playPerfectDodge(),
          onPlayerDamaged: () => synthAudio.playPlayerHurt(),
        });

        hudSyncAccum += rawDt;
        if (hudSyncAccum >= 0.1) {
          hudSyncAccum = 0;
          setHud(makeHudSnapshot(sim));
        }

        if (beatRingRef.current) {
          const grid = computeBeatGridPosition(sim.songTimeSec, sim.timingConfig);
          const pulseScale = 1 + Math.max(0, 1 - grid.beatPhaseNormalized * 2.2) * 0.25;
          beatRingRef.current.style.transform = `scale(${pulseScale.toFixed(3)})`;
        }

        if (cachedH !== canvas.height || !cachedBg) {
          cachedH = canvas.height;
          cachedBg = ctx.createLinearGradient(0, 0, 0, canvas.height);
          cachedBg.addColorStop(0, '#070b14');
          cachedBg.addColorStop(0.5, '#0d1526');
          cachedBg.addColorStop(1, '#090d16');
        }
        drawCorridorScene(ctx, canvas.width, canvas.height, sim, aimNormRef.current, cachedBg);
      } else if (sim.status !== lastStatus) {
        drawCorridorScene(ctx, canvas.width, canvas.height, sim, aimNormRef.current, cachedBg);
      }

      if (sim.status !== lastStatus) {
        lastStatus = sim.status;
        syncDocumentBodyState(sim.status);
        setHud(makeHudSnapshot(sim));
      }

      const elapsedMs = performance.now() - startMs;
      if (sim.status === 'playing') {
        scheduleNext(elapsedMs);
      } else {
        // Idle lightly when paused/title/gameover so compositor stays 100% responsive
        timeoutId = window.setTimeout(() => {
          if (!disposed) animId = requestAnimationFrame(frame);
        }, 120);
      }
    };

    animId = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      clearTimeout(timeoutId);
      ro.disconnect();
    };
  }, [syncDocumentBodyState]);

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    aimNormRef.current = {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    synthAudio.unlock();
    const canvas = canvasRef.current;
    const sim = simRef.current;
    if (!canvas || sim.status !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    aimNormRef.current = { x: normX, y: normY };

    const res = fireSandboxWeapon(sim, normX, normY, canvas.width, canvas.height);
    if (res.fired) {
      synthAudio.playGunshot(res.beatRank);
      if (res.hit) {
        synthAudio.playHitConfirm(res.headshot);
      }
      setHud(makeHudSnapshot(sim));
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070a11] select-none" data-testid="sandbox-shell">
      <canvas
        ref={canvasRef}
        data-testid="sandbox-canvas"
        onPointerMove={handleCanvasPointerMove}
        onPointerDown={handleCanvasPointerDown}
        className="block h-full w-full cursor-crosshair"
      />

      {/* Playing HUD Overlay (only visible while playing or paused) */}
      {(hud.status === 'playing' || hud.status === 'paused') && (
        <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            {/* Top-Left: Health Pips + Score / Combo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2" aria-label={`Health ${hud.health} of ${hud.maxHealth}`}>
                {Array.from({ length: hud.maxHealth }).map((_, idx) => {
                  const filled = idx < hud.health;
                  return (
                    <svg key={idx} viewBox="0 0 24 24" className="h-6 w-6">
                      <polygon
                        points="12,2 21,7 21,17 12,22 3,17 3,7"
                        fill={filled ? '#22d3ee' : 'rgba(15, 23, 42, 0.7)'}
                        stroke={filled ? '#cffafe' : '#475569'}
                        strokeWidth="2"
                      />
                    </svg>
                  );
                })}
                <span className="ml-2 text-xs font-semibold tracking-wider text-slate-300 uppercase">
                  {hud.dodgePosture}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-semibold tracking-wider text-cyan-300 uppercase">Score</div>
                <div
                  className="font-display text-4xl font-bold tabular-nums text-white"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}
                >
                  {Math.round(hud.score.totalScore).toLocaleString()}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-sm font-semibold tabular-nums">
                  <span className="text-amber-300">Combo {hud.score.currentCombo}</span>
                  <span className="text-cyan-300">{hud.score.comboMultiplier}x Mult</span>
                  <span className="text-slate-300">{hud.progressPercent}% Track</span>
                </div>
              </div>
            </div>

            {/* Top-Right: Compact Controls */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleMute();
                }}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              {hud.status === 'playing' && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    togglePause();
                  }}
                  aria-label="Pause run"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  startNewRun();
                }}
                aria-label="Restart run"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={onExitToStudio}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                UE5 Studio
              </button>
            </div>
          </div>

          {/* Floating Callout */}
          {hud.calloutText && hud.status === 'playing' && (
            <div className="self-center text-center">
              <span
                className="font-display text-lg font-bold tracking-wider text-cyan-300"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                {hud.calloutText}
              </span>
            </div>
          )}

          {/* Bottom HUD: Left/Right Pistol Ammo + Beat Pulse Ring */}
          <div className="flex items-end justify-between">
            <div className="min-w-[120px]">
              {hud.dualWield && (
                <>
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Left Pistol</div>
                  <div className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
                    {hud.reloading ? 'RLD' : hud.leftAmmo}
                    <span className="text-sm text-slate-500">/{hud.maxAmmo}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <div
                ref={beatRingRef}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-cyan-400 bg-slate-950/80 font-mono text-[11px] font-semibold text-cyan-200"
              >
                128
              </div>
              <div className="text-xs text-slate-400">
                Click Shoot · A / D / S Head Dodge · R Reload · P Pause
              </div>
            </div>

            <div className="min-w-[120px] text-right">
              <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Right Pistol</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-cyan-300">
                {hud.reloading ? 'RLD' : hud.rightAmmo}
                <span className="text-sm text-slate-500">/{hud.maxAmmo}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Title Screen Modal */}
      {hud.status === 'title' && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#070a11]/88 p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center">
            <svg viewBox="0 0 120 44" className="mx-auto mb-3 h-11 w-auto" aria-hidden="true">
              <polygon points="10,22 24,8 96,8 110,22 96,36 24,36" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
              <line x1="30" y1="22" x2="90" y2="22" stroke="#f97316" strokeWidth="2.5" />
              <circle cx="60" cy="22" r="7" fill="#22d3ee" />
            </svg>

            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              Pulse Trigger VR Sandbox
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              128 BPM OpenXR Rhythm Rail Prototype — Beat-Synced Hitscan, Head Dodge, Dual Wield &amp; S+ Grading.
            </p>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dualWield}
                  onChange={(e) => setDualWield(e.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
                Dual Wield Pistols
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReload}
                  onChange={(e) => setAutoReload(e.target.checked)}
                  className="h-4 w-4 accent-cyan-400"
                />
                Auto Reload
              </label>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewRun(true)}
                className="rounded-lg bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
              >
                Start Run
              </button>
              <button
                type="button"
                onClick={onExitToStudio}
                className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Back to UE5 Studio
              </button>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Mouse Aim &amp; Shoot · A / D Lean · S Duck · R Reload · Enter or Space to Start
            </p>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {hud.status === 'paused' && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/75 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827] p-7 text-center">
            <h2 className="font-display text-2xl font-bold text-white">Run Paused</h2>
            <p className="mt-1 text-sm text-slate-400">
              Score {Math.round(hud.score.totalScore).toLocaleString()} · Track {hud.progressPercent}%
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => startNewRun(true)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Restart Track
              </button>
              <button
                type="button"
                onClick={onExitToStudio}
                className="rounded-lg border border-slate-800 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200"
              >
                Exit to UE5 Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results / Game Over Modal */}
      {(hud.status === 'victory' || hud.status === 'gameover') && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#111827] p-8 text-center">
            <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {hud.status === 'victory' ? 'Track Complete' : 'Run Terminated'}
            </div>
            <div
              className="mt-2 font-display text-6xl font-bold tabular-nums"
              style={{ color: gradeAccentColor(hud.score.finalGrade) }}
            >
              {hud.score.finalGrade}
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold text-white">
              {Math.round(hud.score.totalScore).toLocaleString()} pts
            </h2>

            <div className="mt-6 grid grid-cols-3 gap-4 border-y border-slate-800 py-4 text-center">
              <div>
                <div className="text-xs text-slate-400">Accuracy</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-100">
                  {Math.round(hud.score.accuracyPercent)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">On-Beat</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-cyan-300">
                  {Math.round(hud.score.onBeatPercent)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Max Combo</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-amber-300">
                  {hud.score.maxCombo}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Headshots</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-100">
                  {hud.score.headshots}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Perfect Dodges</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-400">
                  {hud.score.perfectDodges}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Hits Taken</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-rose-400">
                  {hud.score.damageTaken}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewRun(true)}
                className="rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onExitToStudio}
                className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Return to UE5 Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function drawCorridorScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sim: SandboxState,
  aimNorm: { x: number; y: number },
  cachedBg: CanvasGradient | null
): void {
  const shakeAmp = sim.cameraTrauma * sim.cameraTrauma * 14;
  const shakeX = shakeAmp > 0.2 ? (Math.random() - 0.5) * shakeAmp : 0;
  const shakeY = shakeAmp > 0.2 ? (Math.random() - 0.5) * shakeAmp : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Dark synthwave architectural background
  if (cachedBg) {
    ctx.fillStyle = cachedBg;
  } else {
    ctx.fillStyle = '#090e1a';
  }
  ctx.fillRect(0, 0, w, h);

  const vanishX = w * (0.5 - sim.headOffsetX * 0.12);
  const vanishY = h * (0.48 - sim.headCrouchY * 0.14);

  // Beat-reactive perspective corridor ribs
  const pulse = sim.beatPulseIntensity;
  const gridOffset = (sim.railDistanceMeters * 0.35) % 1;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < 12; i++) {
    const t = Math.pow((i + (1 - gridOffset)) / 12, 2.0);
    const boxW = w * 0.96 * t;
    const boxH = h * 0.92 * t;
    const alpha = 0.12 + pulse * 0.26 * t;
    ctx.strokeStyle = i % 2 === 0 ? `rgba(34, 211, 238, ${alpha})` : `rgba(249, 115, 22, ${alpha * 0.7})`;
    ctx.strokeRect(vanishX - boxW * 0.5, vanishY - boxH * 0.5, boxW, boxH);
  }

  // Floor perspective guide rails
  ctx.strokeStyle = `rgba(34, 211, 238, ${0.22 + pulse * 0.25})`;
  for (const lane of [-0.48, -0.24, 0, 0.24, 0.48]) {
    ctx.beginPath();
    ctx.moveTo(vanishX, vanishY);
    ctx.lineTo(vanishX + w * lane * 1.4, h);
    ctx.stroke();
  }

  // Sort enemies far-to-near
  const sortedEnemies = [...sim.enemies].sort((a, b) => b.depthZ - a.depthZ);
  for (const enemy of sortedEnemies) {
    const proj = projectEnemyToNormalizedScreen(enemy, sim.headOffsetX, sim.headCrouchY);
    const ex = proj.screenX * w;
    const ey = proj.screenY * h;
    const size = (enemy.archetype === 'BossUnit' ? 86 : enemy.archetype === 'HeavyUnit' ? 66 : 52) * proj.scale;

    ctx.save();
    if (enemy.state === 'Dead') {
      ctx.globalAlpha = Math.max(0, enemy.koTimer / 0.32);
      ctx.translate(ex, ey + (1 - ctx.globalAlpha) * 26);
      ctx.rotate(0.28);
    } else {
      ctx.translate(ex, ey);
    }

    const bodyColor =
      enemy.hitFlashTimer > 0
        ? '#ffffff'
        : enemy.archetype === 'BossUnit'
          ? '#a855f7'
          : enemy.archetype === 'HeavyUnit'
            ? '#f59e0b'
            : enemy.archetype === 'MeleeCharger'
              ? '#ef4444'
              : enemy.archetype === 'EliteUnit'
                ? '#ec4899'
                : '#f97316';

    // Telegraph ring before enemy fires on beat
    if (enemy.state === 'Telegraphing') {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -size * 0.35, size * 0.9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Stylized torso silhouette
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-size * 0.42, -size * 0.55, size * 0.84, size * 1.15, 6);
    ctx.fill();

    // Armor shield bar on Heavy/Boss
    if (enemy.armor > 0) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(-size * 0.48, -size * 0.62, size * 0.96, size * 1.28);
    }

    // Head hitbox target
    ctx.fillStyle = enemy.hitFlashTimer > 0 ? '#ffffff' : '#fef08a';
    ctx.beginPath();
    ctx.arc(0, -size * 0.85, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Incoming dodgeable neon enemy projectiles
  for (const proj of sim.projectilePool) {
    if (!proj.active || proj.z <= 0.1) continue;
    const fovScale = 1.15 / Math.max(0.9, proj.z * 0.11);
    const px = (0.5 + (proj.x - sim.headOffsetX * 0.65) * fovScale) * w;
    const py = (0.54 - (proj.y + sim.headCrouchY * 0.45) * fovScale) * h;
    const radius = Math.max(4, Math.min(26, 9 * fovScale));

    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath();
    ctx.arc(px, py, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pooled tracer beams
  for (const tracer of sim.tracerPool) {
    if (!tracer.active) continue;
    ctx.strokeStyle = tracer.color;
    ctx.globalAlpha = Math.max(0.15, tracer.life / 0.09);
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(tracer.startX, tracer.startY);
    ctx.lineTo(tracer.endX, tracer.endY);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Pooled impact particles
  for (const pt of sim.particlePool) {
    if (!pt.active) continue;
    ctx.fillStyle = pt.color;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillRect(pt.x - 2.5, pt.y - 2.5, 5, 5);
    ctx.globalAlpha = 1;
  }

  // First-person VR pistol silhouettes with recoil kick
  const drawPistol = (baseX: number, recoil: number, isLeft: boolean) => {
    ctx.save();
    ctx.translate(baseX, h * 0.9 - recoil * 28);
    ctx.rotate((isLeft ? 0.12 : -0.12) + recoil * (isLeft ? -0.18 : 0.18));
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.fillRect(-16, -54, 32, 74);
    ctx.strokeRect(-16, -54, 32, 74);
    ctx.restore();
  };

  if (sim.dualWield) {
    drawPistol(w * 0.28, sim.leftRecoil, true);
  }
  drawPistol(w * 0.72, sim.rightRecoil, false);

  // Aim reticle
  const rx = aimNorm.x * w;
  const ry = aimNorm.y * h;
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rx, ry, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rx - 20, ry);
  ctx.lineTo(rx - 8, ry);
  ctx.moveTo(rx + 8, ry);
  ctx.lineTo(rx + 20, ry);
  ctx.moveTo(rx, ry - 20);
  ctx.lineTo(rx, ry - 8);
  ctx.moveTo(rx, ry + 8);
  ctx.lineTo(rx, ry + 20);
  ctx.stroke();

  ctx.restore();
}
