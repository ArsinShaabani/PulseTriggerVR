import {
  DEFAULT_TIMING_CONFIG,
  applyPerfectDodge,
  applyPlayerDamage,
  applyShotToScore,
  computeBeatGridPosition,
  createInitialScoreMetrics,
  evaluateBeatAccuracy,
  type BeatAccuracyRank,
  type BeatTimingConfig,
  type EnemyArchetype,
  type ScoreMetrics,
} from './rhythmScoring';

export interface SimEnemy {
  id: number;
  archetype: EnemyArchetype;
  laneX: number; // -1.2 to 1.2 normalized horizontal world offset
  depthZ: number; // 4 to 34 meters ahead
  heightY: number; // 0 = standing, 0.45 = elevated
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  state: 'Repositioning' | 'Telegraphing' | 'Attacking' | 'Dead';
  beatsUntilFire: number;
  strafeDir: number;
  hitFlashTimer: number;
  koTimer: number;
  bossPhase: 1 | 2 | 3;
}

export interface SimEnemyProjectile {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  nearMissAwarded: boolean;
}

export interface SimTracerBeam {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  life: number;
}

export interface SimParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface SandboxState {
  status: 'title' | 'playing' | 'paused' | 'victory' | 'gameover';
  songTimeSec: number;
  trackDurationSec: number;
  timingConfig: BeatTimingConfig;
  lastSixteenthIndex: number;
  beatPulseIntensity: number;
  railDistanceMeters: number;
  playerHealth: number;
  maxHealth: number;
  headOffsetX: number; // -0.55 to +0.55 (A/D lean)
  headCrouchY: number; // 0 to -0.45 (S duck)
  invulnTimer: number;
  dualWield: boolean;
  autoReload: boolean;
  leftAmmo: number;
  rightAmmo: number;
  maxAmmo: number;
  reloadTimer: number;
  useLeftNext: boolean;
  leftRecoil: number;
  rightRecoil: number;
  hitstopTimer: number;
  cameraTrauma: number;
  lastCalloutText: string;
  lastCalloutTimer: number;
  score: ScoreMetrics;
  enemies: SimEnemy[];
  projectilePool: SimEnemyProjectile[];
  tracerPool: SimTracerBeam[];
  particlePool: SimParticle[];
  nextEnemyId: number;
  waveCursor: number;
}

export interface StepCallbacks {
  onBeat?: (sixteenthIndex: number) => void;
  onPerfectDodge?: () => void;
  onPlayerDamaged?: () => void;
}

const MAX_PROJ_POOL = 48;
const MAX_TRACER_POOL = 24;
const MAX_PARTICLE_POOL = 96;

interface WaveScheduleItem {
  triggerSixteenth: number;
  archetype: EnemyArchetype;
  laneX: number;
  depthZ: number;
  beatsDelay: number;
}

const LEVEL_TIMELINE: WaveScheduleItem[] = [
  { triggerSixteenth: 8, archetype: 'NormalShooter', laneX: -0.45, depthZ: 22, beatsDelay: 3 },
  { triggerSixteenth: 16, archetype: 'NormalShooter', laneX: 0.45, depthZ: 22, beatsDelay: 3 },
  { triggerSixteenth: 28, archetype: 'NormalShooter', laneX: -0.65, depthZ: 24, beatsDelay: 3 },
  { triggerSixteenth: 32, archetype: 'NormalShooter', laneX: 0.65, depthZ: 24, beatsDelay: 3 },
  { triggerSixteenth: 44, archetype: 'HeavyUnit', laneX: 0.0, depthZ: 20, beatsDelay: 4 },
  { triggerSixteenth: 56, archetype: 'MeleeCharger', laneX: -0.35, depthZ: 26, beatsDelay: 3 },
  { triggerSixteenth: 68, archetype: 'EliteUnit', laneX: 0.55, depthZ: 21, beatsDelay: 3 },
  { triggerSixteenth: 80, archetype: 'NormalShooter', laneX: -0.7, depthZ: 22, beatsDelay: 2 },
  { triggerSixteenth: 84, archetype: 'NormalShooter', laneX: 0.7, depthZ: 22, beatsDelay: 2 },
  { triggerSixteenth: 96, archetype: 'HeavyUnit', laneX: -0.4, depthZ: 21, beatsDelay: 3 },
  { triggerSixteenth: 100, archetype: 'MeleeCharger', laneX: 0.4, depthZ: 26, beatsDelay: 3 },
  { triggerSixteenth: 112, archetype: 'EliteUnit', laneX: 0.0, depthZ: 20, beatsDelay: 3 },
  { triggerSixteenth: 128, archetype: 'BossUnit', laneX: 0.0, depthZ: 19, beatsDelay: 3 },
];

export function createSandboxState(dualWield = true, autoReload = false): SandboxState {
  const projectilePool: SimEnemyProjectile[] = Array.from({ length: MAX_PROJ_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    nearMissAwarded: false,
  }));

  const tracerPool: SimTracerBeam[] = Array.from({ length: MAX_TRACER_POOL }, () => ({
    active: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    color: '#22d3ee',
    life: 0,
  }));

  const particlePool: SimParticle[] = Array.from({ length: MAX_PARTICLE_POOL }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    color: '#22d3ee',
    life: 0,
    maxLife: 0.35,
  }));

  return {
    status: 'title',
    songTimeSec: 0,
    trackDurationSec: 45,
    timingConfig: { ...DEFAULT_TIMING_CONFIG, latencyOffsetMs: 0 },
    lastSixteenthIndex: -1,
    beatPulseIntensity: 0,
    railDistanceMeters: 0,
    playerHealth: 4,
    maxHealth: 4,
    headOffsetX: 0,
    headCrouchY: 0,
    invulnTimer: 0,
    dualWield,
    autoReload,
    leftAmmo: 15,
    rightAmmo: 15,
    maxAmmo: 15,
    reloadTimer: 0,
    useLeftNext: false,
    leftRecoil: 0,
    rightRecoil: 0,
    hitstopTimer: 0,
    cameraTrauma: 0,
    lastCalloutText: '',
    lastCalloutTimer: 0,
    score: createInitialScoreMetrics(),
    enemies: [],
    projectilePool,
    tracerPool,
    particlePool,
    nextEnemyId: 1,
    waveCursor: 0,
  };
}

function createEnemy(id: number, item: WaveScheduleItem): SimEnemy {
  switch (item.archetype) {
    case 'HeavyUnit':
      return {
        id,
        archetype: 'HeavyUnit',
        laneX: item.laneX,
        depthZ: item.depthZ,
        heightY: 0,
        hp: 200,
        maxHp: 200,
        armor: 150,
        maxArmor: 150,
        state: 'Repositioning',
        beatsUntilFire: item.beatsDelay,
        strafeDir: 1,
        hitFlashTimer: 0,
        koTimer: 0,
        bossPhase: 1,
      };
    case 'MeleeCharger':
      return {
        id,
        archetype: 'MeleeCharger',
        laneX: item.laneX,
        depthZ: item.depthZ,
        heightY: 0,
        hp: 100,
        maxHp: 100,
        armor: 0,
        maxArmor: 0,
        state: 'Repositioning',
        beatsUntilFire: item.beatsDelay,
        strafeDir: 1,
        hitFlashTimer: 0,
        koTimer: 0,
        bossPhase: 1,
      };
    case 'EliteUnit':
      return {
        id,
        archetype: 'EliteUnit',
        laneX: item.laneX,
        depthZ: item.depthZ,
        heightY: 0.15,
        hp: 150,
        maxHp: 150,
        armor: 50,
        maxArmor: 50,
        state: 'Repositioning',
        beatsUntilFire: item.beatsDelay,
        strafeDir: item.laneX >= 0 ? -1 : 1,
        hitFlashTimer: 0,
        koTimer: 0,
        bossPhase: 1,
      };
    case 'BossUnit':
      return {
        id,
        archetype: 'BossUnit',
        laneX: 0,
        depthZ: item.depthZ,
        heightY: 0.2,
        hp: 600,
        maxHp: 600,
        armor: 250,
        maxArmor: 250,
        state: 'Repositioning',
        beatsUntilFire: item.beatsDelay,
        strafeDir: 1,
        hitFlashTimer: 0,
        koTimer: 0,
        bossPhase: 1,
      };
    default:
      return {
        id,
        archetype: 'NormalShooter',
        laneX: item.laneX,
        depthZ: item.depthZ,
        heightY: 0,
        hp: 100,
        maxHp: 100,
        armor: 0,
        maxArmor: 0,
        state: 'Repositioning',
        beatsUntilFire: item.beatsDelay,
        strafeDir: 1,
        hitFlashTimer: 0,
        koTimer: 0,
        bossPhase: 1,
      };
  }
}

export function spawnPooledProjectile(
  state: SandboxState,
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number
): void {
  const slot = state.projectilePool.find((p) => !p.active) ?? state.projectilePool[0];
  slot.active = true;
  slot.x = x;
  slot.y = y;
  slot.z = z;
  slot.vx = vx;
  slot.vy = vy;
  slot.vz = vz;
  slot.nearMissAwarded = false;
}

export function spawnPooledParticles(
  state: SandboxState,
  x: number,
  y: number,
  color: string,
  count: number
): void {
  let spawned = 0;
  for (let i = 0; i < state.particlePool.length && spawned < count; i++) {
    const p = state.particlePool[i];
    if (!p.active) {
      const angle = (Math.PI * 2 * spawned) / count + (i % 3) * 0.25;
      const speed = 90 + (i % 5) * 45;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = color;
      p.maxLife = 0.28 + (i % 4) * 0.06;
      p.life = p.maxLife;
      spawned += 1;
    }
  }
}

export function projectEnemyToNormalizedScreen(enemy: SimEnemy, headOffsetX: number, headCrouchY: number): {
  screenX: number; // 0..1
  screenY: number; // 0..1
  scale: number;
} {
  const fovScale = 1.15 / Math.max(2.5, enemy.depthZ * 0.11);
  const screenX = 0.5 + (enemy.laneX - headOffsetX * 0.65) * fovScale;
  const screenY = 0.54 - (enemy.heightY + headCrouchY * 0.45) * fovScale;
  return { screenX, screenY, scale: fovScale };
}

export function stepSandboxSimulation(
  state: SandboxState,
  rawDt: number,
  input: { leanLeft: boolean; leanRight: boolean; crouch: boolean },
  callbacks?: StepCallbacks
): void {
  if (state.status !== 'playing') return;

  const dt = Math.min(rawDt, 0.05);

  // Decay visual timers even during hitstop
  state.beatPulseIntensity = Math.max(0, state.beatPulseIntensity - dt * 4.5);
  state.leftRecoil = Math.max(0, state.leftRecoil - dt * 10);
  state.rightRecoil = Math.max(0, state.rightRecoil - dt * 10);
  state.cameraTrauma = Math.max(0, state.cameraTrauma - dt * 2.8);
  if (state.lastCalloutTimer > 0) {
    state.lastCalloutTimer = Math.max(0, state.lastCalloutTimer - dt);
  }

  for (const t of state.tracerPool) {
    if (t.active) {
      t.life -= dt;
      if (t.life <= 0) t.active = false;
    }
  }
  for (const p of state.particlePool) {
    if (p.active) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    return;
  }

  if (state.invulnTimer > 0) {
    state.invulnTimer = Math.max(0, state.invulnTimer - dt);
  }

  if (state.reloadTimer > 0) {
    state.reloadTimer = Math.max(0, state.reloadTimer - dt);
    if (state.reloadTimer === 0) {
      state.leftAmmo = state.maxAmmo;
      state.rightAmmo = state.maxAmmo;
    }
  }

  // Smooth VR head lean & duck
  const targetLean = (input.leanRight ? 0.55 : 0) - (input.leanLeft ? 0.55 : 0);
  const targetCrouch = input.crouch ? -0.45 : 0;
  state.headOffsetX += (targetLean - state.headOffsetX) * Math.min(1, dt * 12);
  state.headCrouchY += (targetCrouch - state.headCrouchY) * Math.min(1, dt * 12);

  state.songTimeSec += dt;
  state.railDistanceMeters += 6.5 * dt;

  // Beat grid synchronization
  const grid = computeBeatGridPosition(state.songTimeSec, state.timingConfig);
  while (state.lastSixteenthIndex < grid.sixteenthIndex) {
    state.lastSixteenthIndex += 1;
    const idx = state.lastSixteenthIndex;
    if (idx % 4 === 0) {
      state.beatPulseIntensity = 1.0;
    }
    callbacks?.onBeat?.(idx);

    // Trigger timeline wave spawns (loop waves smoothly if song continues)
    while (state.waveCursor < LEVEL_TIMELINE.length) {
      const nextWave = LEVEL_TIMELINE[state.waveCursor];
      if (nextWave.triggerSixteenth <= idx) {
        state.enemies.push(createEnemy(state.nextEnemyId++, nextWave));
        state.waveCursor += 1;
      } else {
        break;
      }
    }

    // Enemy quarter-beat firing cadence
    if (idx % 4 === 0) {
      for (const enemy of state.enemies) {
        if (enemy.state === 'Dead') continue;
        enemy.beatsUntilFire -= 1;
        if (enemy.beatsUntilFire === 1) {
          enemy.state = 'Telegraphing';
        } else if (enemy.beatsUntilFire <= 0) {
          enemy.state = 'Attacking';
          enemy.beatsUntilFire = enemy.archetype === 'EliteUnit' || enemy.archetype === 'BossUnit' ? 3 : 4;
          fireEnemyAttack(state, enemy);
        }
      }
    }
  }

  // Update enemies
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.hitFlashTimer > 0) e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);

    if (e.state === 'Dead') {
      e.koTimer -= dt;
      if (e.koTimer <= 0) {
        state.enemies.splice(i, 1);
      }
      continue;
    }

    if (e.archetype === 'MeleeCharger') {
      e.depthZ -= 5.4 * dt;
      e.laneX += (state.headOffsetX - e.laneX) * dt * 1.1;
      if (e.depthZ <= 2.2) {
        damagePlayer(state, callbacks);
        e.state = 'Dead';
        e.koTimer = 0.25;
      }
    } else {
      // Gently approach down the spline until holding tactical firing distance
      if (e.depthZ > 11.5) {
        e.depthZ -= 2.4 * dt;
      }
      if (e.archetype === 'EliteUnit' || e.archetype === 'BossUnit') {
        e.laneX += e.strafeDir * 0.42 * dt;
        if (Math.abs(e.laneX) > 0.78) {
          e.strafeDir *= -1;
          e.laneX = Math.sign(e.laneX) * 0.78;
        }
      }
    }
  }

  // Update pooled enemy projectiles & detect head hit vs Perfect Dodge near-miss
  for (const proj of state.projectilePool) {
    if (!proj.active) continue;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.z += proj.vz * dt;

    if (proj.z <= 0.45 && proj.z >= -0.45) {
      const dx = proj.x - state.headOffsetX;
      const dy = proj.y - state.headCrouchY;
      const dist = Math.hypot(dx, dy);

      if (dist <= 0.21) {
        proj.active = false;
        damagePlayer(state, callbacks);
      } else if (dist <= 0.68 && !proj.nearMissAwarded) {
        proj.nearMissAwarded = true;
        const dodgeRes = applyPerfectDodge(state.score);
        state.score = dodgeRes.next;
        state.lastCalloutText = `PERFECT DODGE +${dodgeRes.pointsAwarded}`;
        state.lastCalloutTimer = 0.9;
        callbacks?.onPerfectDodge?.();
      }
    }

    if (proj.z < -1.2) {
      proj.active = false;
    }
  }

  // Track completion check
  if (state.songTimeSec >= state.trackDurationSec) {
    state.status = 'victory';
  }
}

function fireEnemyAttack(state: SandboxState, enemy: SimEnemy): void {
  if (enemy.archetype === 'MeleeCharger') {
    enemy.depthZ = Math.max(3.5, enemy.depthZ - 2.5);
    return;
  }

  const speedZ = -10.5;
  const timeToPlayer = Math.max(0.4, enemy.depthZ / Math.abs(speedZ));
  const aimVx = (state.headOffsetX - enemy.laneX) / timeToPlayer;
  const aimVy = (state.headCrouchY - enemy.heightY) / timeToPlayer;

  if (enemy.archetype === 'BossUnit') {
    const spreadCount = enemy.bossPhase === 3 ? 5 : enemy.bossPhase === 2 ? 3 : 2;
    for (let i = 0; i < spreadCount; i++) {
      const offset = (i - (spreadCount - 1) / 2) * 0.36;
      spawnPooledProjectile(state, enemy.laneX, enemy.heightY, enemy.depthZ, aimVx + offset, aimVy, speedZ);
    }
    return;
  }

  if (enemy.archetype === 'EliteUnit') {
    spawnPooledProjectile(state, enemy.laneX, enemy.heightY, enemy.depthZ, aimVx - 0.28, aimVy, speedZ);
    spawnPooledProjectile(state, enemy.laneX, enemy.heightY, enemy.depthZ, aimVx + 0.28, aimVy, speedZ);
    return;
  }

  spawnPooledProjectile(state, enemy.laneX, enemy.heightY, enemy.depthZ, aimVx, aimVy, speedZ);
}

function damagePlayer(state: SandboxState, callbacks?: StepCallbacks): void {
  if (state.invulnTimer > 0 || state.playerHealth <= 0) return;
  state.playerHealth = Math.max(0, state.playerHealth - 1);
  state.invulnTimer = 0.7;
  state.cameraTrauma = 0.85;
  state.hitstopTimer = 0.05;
  state.score = applyPlayerDamage(state.score);
  state.lastCalloutText = 'HIT — COMBO RESET';
  state.lastCalloutTimer = 1.0;
  callbacks?.onPlayerDamaged?.();

  if (state.playerHealth <= 0) {
    state.status = 'gameover';
  }
}

export function triggerSandboxReload(state: SandboxState): boolean {
  if (state.reloadTimer > 0) return false;
  if (state.leftAmmo === state.maxAmmo && state.rightAmmo === state.maxAmmo) return false;
  state.reloadTimer = 0.38;
  state.lastCalloutText = 'RELOADING';
  state.lastCalloutTimer = 0.5;
  return true;
}

export function fireSandboxWeapon(
  state: SandboxState,
  aimNormX: number,
  aimNormY: number,
  canvasWidth: number,
  canvasHeight: number
): {
  fired: boolean;
  hit: boolean;
  headshot: boolean;
  kill: boolean;
  beatRank: BeatAccuracyRank;
} {
  if (state.status !== 'playing' || state.reloadTimer > 0) {
    return { fired: false, hit: false, headshot: false, kill: false, beatRank: 'OffBeat' };
  }

  const useLeft = state.dualWield ? state.useLeftNext : false;
  if (state.dualWield) state.useLeftNext = !state.useLeftNext;

  const currentAmmo = useLeft ? state.leftAmmo : state.rightAmmo;
  if (currentAmmo <= 0) {
    if (state.autoReload) {
      triggerSandboxReload(state);
    } else {
      state.lastCalloutText = 'EMPTY — PRESS R TO RELOAD';
      state.lastCalloutTimer = 0.75;
    }
    return { fired: false, hit: false, headshot: false, kill: false, beatRank: 'OffBeat' };
  }

  if (useLeft) {
    state.leftAmmo -= 1;
    state.leftRecoil = 1.0;
    if (state.leftAmmo === 0 && state.autoReload) triggerSandboxReload(state);
  } else {
    state.rightAmmo -= 1;
    state.rightRecoil = 1.0;
    if (state.rightAmmo === 0 && state.autoReload) triggerSandboxReload(state);
  }

  const beatEval = evaluateBeatAccuracy(state.songTimeSec, state.timingConfig);

  // Hitscan check against projected enemy bounds (with VR magnetism)
  let bestEnemy: SimEnemy | null = null;
  let bestDist = Infinity;
  let isHeadshot = false;

  for (const enemy of state.enemies) {
    if (enemy.state === 'Dead') continue;
    const proj = projectEnemyToNormalizedScreen(enemy, state.headOffsetX, state.headCrouchY);
    const bodyRadiusNorm = (enemy.archetype === 'BossUnit' ? 0.085 : 0.058) * proj.scale;
    const headYNorm = proj.screenY - bodyRadiusNorm * 0.92;

    const headDist = Math.hypot(aimNormX - proj.screenX, aimNormY - headYNorm);
    const bodyDist = Math.hypot(aimNormX - proj.screenX, aimNormY - proj.screenY);

    if (headDist <= bodyRadiusNorm * 0.62 && headDist < bestDist) {
      bestDist = headDist;
      bestEnemy = enemy;
      isHeadshot = true;
    } else if (bodyDist <= bodyRadiusNorm * 1.15 && bodyDist < bestDist) {
      bestDist = bodyDist;
      bestEnemy = enemy;
      isHeadshot = false;
    }
  }

  let kill = false;
  if (bestEnemy) {
    const rawDamage = isHeadshot ? 200 : 100;
    let remaining = rawDamage;
    if (bestEnemy.armor > 0) {
      const absorbed = Math.min(bestEnemy.armor, remaining);
      bestEnemy.armor -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) {
      bestEnemy.hp -= remaining;
    }
    bestEnemy.hitFlashTimer = 0.08;

    if (bestEnemy.archetype === 'BossUnit' && bestEnemy.hp > 0) {
      const ratio = bestEnemy.hp / bestEnemy.maxHp;
      bestEnemy.bossPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    }

    if (bestEnemy.hp <= 0) {
      kill = true;
      bestEnemy.state = 'Dead';
      bestEnemy.koTimer = 0.32;
      state.hitstopTimer = 0.04;
      state.cameraTrauma = Math.min(1, state.cameraTrauma + 0.35);
      spawnPooledParticles(
        state,
        aimNormX * canvasWidth,
        aimNormY * canvasHeight,
        isHeadshot ? '#facc15' : '#22d3ee',
        16
      );
    } else {
      spawnPooledParticles(state, aimNormX * canvasWidth, aimNormY * canvasHeight, '#f97316', 8);
    }
  }

  const scoreRes = applyShotToScore(state.score, {
    hit: Boolean(bestEnemy),
    headshot: isHeadshot,
    kill,
    beatRank: beatEval.rank,
  });
  state.score = scoreRes.next;

  if (bestEnemy) {
    const tag = isHeadshot ? 'HEADSHOT' : beatEval.rank.toUpperCase();
    state.lastCalloutText = `${tag} +${scoreRes.pointsAwarded}`;
    state.lastCalloutTimer = 0.75;
  } else {
    state.lastCalloutText = 'MISS';
    state.lastCalloutTimer = 0.45;
  }

  // Acquire pooled tracer beam
  const tracer = state.tracerPool.find((t) => !t.active) ?? state.tracerPool[0];
  tracer.active = true;
  tracer.startX = (useLeft ? 0.28 : 0.72) * canvasWidth;
  tracer.startY = 0.88 * canvasHeight;
  tracer.endX = aimNormX * canvasWidth;
  tracer.endY = aimNormY * canvasHeight;
  tracer.color = beatEval.rank === 'Perfect' ? '#22d3ee' : '#fb923c';
  tracer.life = 0.09;

  return {
    fired: true,
    hit: Boolean(bestEnemy),
    headshot: isHeadshot,
    kill,
    beatRank: beatEval.rank,
  };
}
