import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  createSandboxState,
  fireSandboxWeapon,
  stepSandboxSimulation,
  triggerSandboxReload,
  type SandboxState,
  type StageThemeId,
} from '../engine/sandboxSimulation';
import { computeBeatGridPosition, type PerformanceGrade, type ScoreMetrics } from '../engine/rhythmScoring';
import { synthAudio } from '../engine/synthAudio';
import { PistolWhip3DEngine } from '../engine/threeScene/PistolWhip3DEngine';
import { THREE_THEME_PALETTES } from '../engine/threeScene/themePalettes';

interface RhythmSandboxViewProps {
  autoStart: boolean;
  onExitToStudio: () => void;
}

interface HudSnapshot {
  status: SandboxState['status'];
  theme: StageThemeId;
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
  damagedFlash: boolean;
}

function makeHudSnapshot(sim: SandboxState): HudSnapshot {
  let dodgePosture: HudSnapshot['dodgePosture'] = 'Center';
  if (sim.headCrouchY < -0.18) dodgePosture = 'Duck';
  else if (sim.headOffsetX < -0.18) dodgePosture = 'Lean Left';
  else if (sim.headOffsetX > 0.18) dodgePosture = 'Lean Right';

  return {
    status: sim.status,
    theme: sim.theme,
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
    damagedFlash: sim.invulnTimer > 0.4,
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
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PistolWhip3DEngine | null>(null);
  const beatRingRef = useRef<HTMLDivElement | null>(null);
  const crosshairRef = useRef<HTMLDivElement | null>(null);

  const [dualWield, setDualWield] = useState(true);
  const [autoReload, setAutoReload] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<StageThemeId>('sunset');
  const [muted, setMuted] = useState(false);

  const simRef = useRef<SandboxState>(createSandboxState(true, false, 'sunset'));
  const keysRef = useRef<Set<string>>(new Set());
  const aimNormRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const requestRenderRef = useRef<() => void>(() => {});

  const [hud, setHud] = useState<HudSnapshot>(() => makeHudSnapshot(simRef.current));

  const syncDocumentBodyState = useCallback((status: SandboxState['status']) => {
    if (status === 'victory' || status === 'gameover') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = status;
    }
  }, []);

  const handleSelectTheme = useCallback((theme: StageThemeId) => {
    setSelectedTheme(theme);
    simRef.current.theme = theme;
    setHud(makeHudSnapshot(simRef.current));
    requestRenderRef.current();
  }, []);

  const startNewRun = useCallback(
    (fromUserGesture = true) => {
      if (fromUserGesture) {
        synthAudio.unlock();
      }
      const fresh = createSandboxState(dualWield, autoReload, selectedTheme);
      fresh.status = 'playing';
      simRef.current = fresh;
      keysRef.current.clear();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      syncDocumentBodyState('playing');
      setHud(makeHudSnapshot(fresh));
      requestRenderRef.current();
    },
    [dualWield, autoReload, selectedTheme, syncDocumentBodyState]
  );

  const togglePause = useCallback(() => {
    const sim = simRef.current;
    if (sim.status === 'playing') {
      sim.status = 'paused';
      keysRef.current.clear();
      syncDocumentBodyState('paused');
      setHud(makeHudSnapshot(sim));
      requestRenderRef.current();
    } else if (sim.status === 'paused') {
      sim.status = 'playing';
      syncDocumentBodyState('playing');
      setHud(makeHudSnapshot(sim));
      requestRenderRef.current();
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

  // Mount Three.js 3D WebGL Engine once with Software-WebGL afterDraw pacing
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new PistolWhip3DEngine(container, simRef.current.theme);
    engineRef.current = engine;

    let frameId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;
    let lastStatus = simRef.current.status;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let loopRunning = false;

    const afterDraw = (cb: () => void) => {
      const gl = engine.getContext();
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const stepAndDrawFrame = (now: number) => {
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
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
        if (hudSyncAccum >= 0.08) {
          hudSyncAccum = 0;
          setHud(makeHudSnapshot(sim));
        }
      }

      const grid = computeBeatGridPosition(sim.songTimeSec, sim.timingConfig);
      if (beatRingRef.current) {
        const pulseScale = 1 + Math.max(0, 1 - grid.beatPhaseNormalized * 2.1) * 0.3;
        beatRingRef.current.style.transform = `scale(${pulseScale.toFixed(3)})`;
      }

      if (sim.status !== lastStatus) {
        lastStatus = sim.status;
        syncDocumentBodyState(sim.status);
        setHud(makeHudSnapshot(sim));
      }

      engine.syncAndRender(sim, aimNormRef.current, grid.beatPhaseNormalized, rawDt);
    };

    const tick = () => {
      if (disposed) return;
      if (simRef.current.status !== 'playing') {
        loopRunning = false;
        return;
      }
      stepAndDrawFrame(performance.now());
      if (engine.isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const requestRender = () => {
      if (disposed) return;
      if (simRef.current.status === 'playing') {
        if (!loopRunning) {
          loopRunning = true;
          lastTime = performance.now();
          frameId = requestAnimationFrame(tick);
        }
        return;
      }

      // On-demand render when paused/title/gameover
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        renderDirty = false;
        if (!disposed) {
          stepAndDrawFrame(now);
        }
        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (engine.isSoftwareGl && !disposed) afterDraw(done);
        else done();
      });
    };

    requestRenderRef.current = requestRender;

    const ro = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        engine.resize(rect.width, rect.height);
        requestRender();
      }
    });
    ro.observe(container);

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      engine.dispose();
      engineRef.current = null;
      if (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [syncDocumentBodyState]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    aimNormRef.current = { x: normX, y: normY };

    if (crosshairRef.current) {
      crosshairRef.current.style.transform = `translate3d(${(normX * rect.width).toFixed(1)}px, ${(normY * rect.height).toFixed(1)}px, 0)`;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    synthAudio.unlock();
    const container = canvasMountRef.current;
    const sim = simRef.current;
    if (!container || sim.status !== 'playing') return;

    const rect = container.getBoundingClientRect();
    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    aimNormRef.current = { x: normX, y: normY };

    const res = fireSandboxWeapon(sim, normX, normY, rect.width, rect.height);
    if (res.fired) {
      synthAudio.playGunshot(res.beatRank);
      if (res.hit) {
        synthAudio.playHitConfirm(res.headshot);
        if (res.kill && res.hitEnemyWorld) {
          engineRef.current?.triggerKillVfx3D(
            res.hitEnemyWorld.x,
            res.hitEnemyWorld.y,
            res.hitEnemyWorld.z,
            res.headshot
          );
        }
      }
      setHud(makeHudSnapshot(sim));
    }
  };

  const shieldIntegrityRatio = hud.maxHealth > 0 ? hud.health / hud.maxHealth : 0;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070a11] select-none" data-testid="sandbox-shell">
      {/* Isolated WebGL Three.js Mount Container */}
      <div
        ref={canvasMountRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className="absolute inset-0 h-full w-full cursor-crosshair"
      />

      {/* Hit Damage Screen Vignette */}
      {hud.damagedFlash && hud.status === 'playing' && (
        <div
          className="pointer-events-none fixed inset-0"
          style={{ boxShadow: 'inset 0 0 95px rgba(244, 63, 94, 0.72)' }}
        />
      )}

      {/* High-Contrast Tactical Reticle */}
      {hud.status === 'playing' && (
        <div
          ref={crosshairRef}
          className="pointer-events-none fixed top-0 left-0 -ml-5 -mt-5 h-10 w-10"
          style={{ transform: 'translate3d(50vw, 50vh, 0)' }}
        >
          <svg viewBox="0 0 40 40" className="h-full w-full">
            <circle cx="20" cy="20" r="12" fill="none" stroke="#ffffff" strokeWidth="2" />
            <circle cx="20" cy="20" r="12" fill="none" stroke="#ff3b9a" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="20" cy="20" r="2.2" fill="#fde047" />
            <line x1="2" y1="20" x2="10" y2="20" stroke="#ff3b9a" strokeWidth="2" />
            <line x1="30" y1="20" x2="38" y2="20" stroke="#ff3b9a" strokeWidth="2" />
            <line x1="20" y1="2" x2="20" y2="10" stroke="#ff3b9a" strokeWidth="2" />
            <line x1="20" y1="30" x2="20" y2="38" stroke="#ff3b9a" strokeWidth="2" />
          </svg>
        </div>
      )}

      {/* Diegetic Pistol Whip HUD Overlay (only visible while playing or paused) */}
      {(hud.status === 'playing' || hud.status === 'paused') && (
        <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-5 sm:p-7">
          {/* Top Row: Score + Top-Right Controls */}
          <div className="flex items-start justify-between">
            <div>
              <div
                className="font-display text-4xl font-extrabold italic tracking-tight tabular-nums text-white"
                style={{
                  textShadow:
                    '-2px -2px 0 #090d16, 2px -2px 0 #090d16, -2px 2px 0 #090d16, 2px 2px 0 #090d16, 0 4px 12px rgba(0,0,0,0.65)',
                }}
              >
                {Math.round(hud.score.totalScore).toLocaleString()}
              </div>
              <div
                className="mt-1 flex items-center gap-3 text-xs font-bold tracking-wider uppercase tabular-nums text-white"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                <span>{THREE_THEME_PALETTES[hud.theme].label}</span>
                <span className="text-amber-300">{hud.progressPercent}% Track</span>
                <span className="text-cyan-200">{hud.dodgePosture}</span>
              </div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  toggleMute();
                }}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-900/80 bg-slate-950/85 text-white hover:bg-slate-800"
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
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-900/80 bg-slate-950/85 text-white hover:bg-slate-800"
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
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-900/80 bg-slate-950/85 text-white hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={onExitToStudio}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-900/80 bg-slate-950/85 px-3.5 text-xs font-semibold text-white hover:bg-slate-800"
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
                className="font-display text-xl font-extrabold italic tracking-wider text-white uppercase"
                style={{
                  textShadow:
                    '-2px -2px 0 #090d16, 2px -2px 0 #090d16, -2px 2px 0 #090d16, 2px 2px 0 #090d16',
                }}
              >
                {hud.calloutText}
              </span>
            </div>
          )}

          {/* Bottom Row: Iconic Pistol Whip Jagged Shatter Medallions */}
          <div className="flex items-end justify-between">
            {/* Bottom-Left: Armor Heart-Shield Medallion with Shatter Spikes */}
            <div
              className="relative flex h-28 w-28 items-center justify-center"
              aria-label={`Armor ${hud.health} of ${hud.maxHealth}`}
            >
              <svg viewBox="0 0 140 140" className="h-full w-full overflow-visible">
                <g fill="#090d16" opacity="0.88">
                  <polygon points="16,44 3,34 22,58" />
                  <polygon points="28,22 14,7 40,28" />
                  <polygon points="94,16 108,4 82,28" />
                  <polygon points="122,48 138,42 114,62" />
                  <polygon points="116,96 134,108 106,108" />
                  <polygon points="24,100 8,112 36,110" />
                  <polygon points="62,124 58,139 76,122" />
                </g>
                <circle cx="70" cy="70" r="46" fill="#0f172a" stroke="#1e293b" strokeWidth="3" />
                <circle
                  cx="70"
                  cy="70"
                  r="37"
                  fill={shieldIntegrityRatio > 0.25 ? '#b4bce6' : '#f43f5e'}
                  stroke="#090d16"
                  strokeWidth="3"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="41"
                  fill="none"
                  stroke="#f8fafc"
                  strokeWidth="3.5"
                  strokeDasharray={`${Math.round(shieldIntegrityRatio * 257)} 260`}
                  transform="rotate(-90 70 70)"
                />
                <path
                  d="M70 43 L90 50 V68 C90 83 81 93 70 98 C59 93 50 83 50 68 V50 Z"
                  fill="#090d16"
                  stroke="#f8fafc"
                  strokeWidth="2.5"
                />
                <path
                  d="M70 81 C70 81 59 73 59 65 C59 60.5 62.8 57.5 66.2 57.5 C68.3 57.5 69.5 58.6 70 59.8 C70.5 58.6 71.7 57.5 73.8 57.5 C77.2 57.5 81 60.5 81 65 C81 73 70 81 70 81 Z"
                  fill={hud.health > 0 ? '#f8fafc' : '#475569'}
                />
              </svg>
              <span className="absolute -bottom-1 rounded bg-[#090d16] px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-white">
                {hud.health}/{hud.maxHealth}
              </span>
            </div>

            {/* Bottom-Center Control Hint */}
            <div className="mb-1 text-center">
              {hud.reloading && (
                <div
                  className="mb-1.5 font-display text-sm font-extrabold tracking-widest text-amber-300 uppercase"
                  style={{ textShadow: '0 2px 6px #090d16' }}
                >
                  Reloading...
                </div>
              )}
              <div className="inline-block rounded-md bg-[#090d16]/80 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                Click Shoot · A / D / S Dodge · R Reload · P Pause
              </div>
            </div>

            {/* Bottom-Right: Multiplier Medallion with Shatter Spikes + Pulsing Beat Ring */}
            <div
              className="relative flex h-28 w-28 items-center justify-center"
              aria-label={`Multiplier ${hud.score.comboMultiplier}x`}
            >
              <div
                ref={beatRingRef}
                className="pointer-events-none absolute inset-1 rounded-full border-[3px] border-white/90"
                style={{ boxShadow: '0 0 12px rgba(255,255,255,0.45)' }}
              />
              <svg viewBox="0 0 140 140" className="h-full w-full overflow-visible">
                <g fill="#090d16" opacity="0.88">
                  <polygon points="18,46 2,34 22,60" />
                  <polygon points="34,20 20,4 46,26" />
                  <polygon points="104,20 120,6 92,30" />
                  <polygon points="120,58 138,54 114,72" />
                  <polygon points="112,102 130,116 102,110" />
                  <polygon points="26,98 8,112 38,108" />
                </g>
                <circle cx="70" cy="70" r="45" fill="#090d16" stroke="#1e293b" strokeWidth="3" />
                <circle cx="70" cy="70" r="35" fill="#1d4ed8" stroke="#090d16" strokeWidth="3" />
                <text
                  x="70"
                  y="78"
                  textAnchor="middle"
                  fill="#ffffff"
                  stroke="#090d16"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                  className="font-display text-2xl font-black italic tabular-nums"
                >
                  {hud.score.comboMultiplier}x
                </text>
              </svg>
              <span className="absolute -bottom-1 rounded bg-[#090d16] px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-cyan-300">
                {hud.score.currentCombo} HIT
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Title Screen Modal */}
      {hud.status === 'title' && (
        <div className="fixed inset-0 flex items-center justify-center bg-[#070a11]/72 p-6">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-[#0f1624] p-7 text-center">
            <svg viewBox="0 0 120 44" className="mx-auto mb-3 h-10 w-auto" aria-hidden="true">
              <polygon points="10,22 24,8 96,8 110,22 96,36 24,36" fill="#090d16" stroke="#f472b6" strokeWidth="2.5" />
              <line x1="28" y1="22" x2="92" y2="22" stroke="#fde047" strokeWidth="2.5" />
              <circle cx="60" cy="22" r="7" fill="#22d3ee" />
            </svg>

            <h1 className="font-display text-3xl font-extrabold italic tracking-tight text-white">
              PULSE TRIGGER VR 3D
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              128 BPM OpenXR Rhythm Shooter — Full 3D PBR Stage, Sculpted Pistols, Articulated Guards &amp; S+ Rank
            </p>

            <div className="mt-5 text-left">
              <div className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Stage Visual Scene
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(['sunset', 'twilight', 'dreadnought'] as StageThemeId[]).map((themeId) => {
                  const pal = THREE_THEME_PALETTES[themeId];
                  const active = selectedTheme === themeId;
                  return (
                    <button
                      key={themeId}
                      type="button"
                      onClick={() => handleSelectTheme(themeId)}
                      className={`rounded-lg border p-2.5 text-left transition-colors ${
                        active
                          ? 'border-cyan-400 bg-slate-800/90 text-white'
                          : 'border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="mb-2 h-2.5 w-full rounded-sm" style={{ background: pal.swatch }} />
                      <div className="text-xs font-bold">{pal.label}</div>
                      <div className="mt-0.5 text-[11px] leading-tight text-slate-400">{pal.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-6 text-xs text-slate-200">
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

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewRun(true)}
                className="rounded-lg bg-cyan-400 px-7 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition-colors"
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

            <p className="mt-5 text-xs text-slate-400">
              Mouse Aim &amp; Shoot · A / D Lean · S Duck · R Reload · Enter or Space to Start
            </p>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {hud.status === 'paused' && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f1624] p-7 text-center">
            <h2 className="font-display text-2xl font-bold text-white">Run Paused</h2>
            <p className="mt-1 text-sm text-slate-300">
              Score {Math.round(hud.score.totalScore).toLocaleString()} · Track {hud.progressPercent}%
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300"
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
                className="rounded-lg border border-slate-700 bg-transparent px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white"
              >
                Exit to UE5 Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results / Game Over Modal */}
      {(hud.status === 'victory' || hud.status === 'gameover') && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/78 p-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0f1624] p-8 text-center">
            <div className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              {hud.status === 'victory' ? 'Track Complete' : 'Run Terminated'}
            </div>
            <div
              className="mt-2 font-display text-6xl font-black italic tabular-nums"
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
                className="rounded-lg bg-cyan-400 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300"
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
