export type BeatSubdivision = '1/4' | '1/8' | '1/16';
export type BeatAccuracyRank = 'Perfect' | 'Great' | 'Good' | 'OffBeat';
export type PerformanceGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
export type EnemyArchetype = 'NormalShooter' | 'HeavyUnit' | 'MeleeCharger' | 'EliteUnit' | 'BossUnit';

export interface BeatTimingConfig {
  bpm: number;
  beatsPerMeasure: number;
  latencyOffsetMs: number;
  perfectWindowMs: number;
  greatWindowMs: number;
  goodWindowMs: number;
}

export interface BeatGridPosition {
  songTimeCompensatedSec: number;
  measureIndex: number;
  beatInMeasure: number;
  sixteenthIndex: number;
  beatPhaseNormalized: number;
  isQuarterBeat: boolean;
  isEighthBeat: boolean;
  isSixteenthBeat: boolean;
}

export interface ShotEvaluationInput {
  hit: boolean;
  headshot: boolean;
  kill: boolean;
  beatRank: BeatAccuracyRank;
}

export interface ScoreMetrics {
  totalScore: number;
  currentCombo: number;
  maxCombo: number;
  comboMultiplier: number;
  shotsFired: number;
  shotsHit: number;
  onBeatHits: number;
  headshots: number;
  perfectDodges: number;
  damageTaken: number;
  accuracyPercent: number;
  onBeatPercent: number;
  finalGrade: PerformanceGrade;
}

export const DEFAULT_TIMING_CONFIG: BeatTimingConfig = {
  bpm: 128,
  beatsPerMeasure: 4,
  latencyOffsetMs: 18,
  perfectWindowMs: 45,
  greatWindowMs: 95,
  goodWindowMs: 145,
};

export function createInitialScoreMetrics(): ScoreMetrics {
  return {
    totalScore: 0,
    currentCombo: 0,
    maxCombo: 0,
    comboMultiplier: 1,
    shotsFired: 0,
    shotsHit: 0,
    onBeatHits: 0,
    headshots: 0,
    perfectDodges: 0,
    damageTaken: 0,
    accuracyPercent: 100,
    onBeatPercent: 100,
    finalGrade: 'S+',
  };
}

export function computeBeatGridPosition(
  rawSongTimeSec: number,
  config: BeatTimingConfig
): BeatGridPosition {
  const safeBpm = Math.max(30, config.bpm);
  const secondsPerQuarter = 60 / safeBpm;
  const secondsPerSixteenth = secondsPerQuarter * 0.25;
  const compensated = Math.max(0, rawSongTimeSec - config.latencyOffsetMs * 0.001);

  const quarterFloat = compensated / secondsPerQuarter;
  const beatPhaseNormalized = quarterFloat - Math.floor(quarterFloat);
  const sixteenthIndex = Math.floor(compensated / secondsPerSixteenth);
  const sixteenthsPerMeasure = Math.max(1, config.beatsPerMeasure) * 4;

  return {
    songTimeCompensatedSec: compensated,
    measureIndex: Math.floor(sixteenthIndex / sixteenthsPerMeasure),
    beatInMeasure: Math.floor((sixteenthIndex % sixteenthsPerMeasure) / 4),
    sixteenthIndex,
    beatPhaseNormalized,
    isQuarterBeat: sixteenthIndex % 4 === 0,
    isEighthBeat: sixteenthIndex % 2 === 0,
    isSixteenthBeat: true,
  };
}

export function evaluateBeatAccuracy(
  rawSongTimeSec: number,
  config: BeatTimingConfig
): { rank: BeatAccuracyRank; errorMs: number } {
  const safeBpm = Math.max(30, config.bpm);
  const secondsPerQuarter = 60 / safeBpm;
  const grid = computeBeatGridPosition(rawSongTimeSec, config);
  const nearestBeatFrac = Math.min(grid.beatPhaseNormalized, 1 - grid.beatPhaseNormalized);
  const errorMs = nearestBeatFrac * secondsPerQuarter * 1000;

  if (errorMs <= config.perfectWindowMs) {
    return { rank: 'Perfect', errorMs };
  }
  if (errorMs <= config.greatWindowMs) {
    return { rank: 'Great', errorMs };
  }
  if (errorMs <= config.goodWindowMs) {
    return { rank: 'Good', errorMs };
  }
  return { rank: 'OffBeat', errorMs };
}

export function computeComboMultiplier(combo: number): number {
  if (combo >= 24) return 8;
  if (combo >= 12) return 4;
  if (combo >= 4) return 2;
  return 1;
}

export function applyShotToScore(
  prev: ScoreMetrics,
  shot: ShotEvaluationInput
): { next: ScoreMetrics; pointsAwarded: number } {
  const next: ScoreMetrics = { ...prev, shotsFired: prev.shotsFired + 1 };

  if (!shot.hit) {
    next.currentCombo = 0;
    next.comboMultiplier = 1;
    next.accuracyPercent = (next.shotsHit / next.shotsFired) * 100;
    next.finalGrade = computePerformanceGrade(next);
    return { next, pointsAwarded: 0 };
  }

  next.shotsHit += 1;
  next.currentCombo += 1;
  next.maxCombo = Math.max(next.maxCombo, next.currentCombo);
  next.comboMultiplier = computeComboMultiplier(next.currentCombo);

  const baseScore = shot.kill ? 200 : 100;
  let beatBonus = 0;
  if (shot.beatRank === 'Perfect') {
    beatBonus = 150;
    next.onBeatHits += 1;
  } else if (shot.beatRank === 'Great') {
    beatBonus = 100;
    next.onBeatHits += 1;
  } else if (shot.beatRank === 'Good') {
    beatBonus = 50;
    next.onBeatHits += 1;
  }

  let headshotBonus = 0;
  if (shot.headshot) {
    headshotBonus = 125;
    next.headshots += 1;
  }

  const pointsAwarded = (baseScore + beatBonus + headshotBonus) * next.comboMultiplier;
  next.totalScore += pointsAwarded;
  next.accuracyPercent = (next.shotsHit / next.shotsFired) * 100;
  next.onBeatPercent = (next.onBeatHits / next.shotsHit) * 100;
  next.finalGrade = computePerformanceGrade(next);

  return { next, pointsAwarded };
}

export function applyPerfectDodge(prev: ScoreMetrics): { next: ScoreMetrics; pointsAwarded: number } {
  const next: ScoreMetrics = { ...prev };
  next.perfectDodges += 1;
  next.currentCombo += 1;
  next.maxCombo = Math.max(next.maxCombo, next.currentCombo);
  next.comboMultiplier = computeComboMultiplier(next.currentCombo);
  const pointsAwarded = 250 * next.comboMultiplier;
  next.totalScore += pointsAwarded;
  next.finalGrade = computePerformanceGrade(next);
  return { next, pointsAwarded };
}

export function applyPlayerDamage(prev: ScoreMetrics): ScoreMetrics {
  const next: ScoreMetrics = {
    ...prev,
    damageTaken: prev.damageTaken + 1,
    currentCombo: 0,
    comboMultiplier: 1,
  };
  next.finalGrade = computePerformanceGrade(next);
  return next;
}

export function computePerformanceGrade(metrics: ScoreMetrics): PerformanceGrade {
  const composite =
    metrics.accuracyPercent * 0.48 +
    metrics.onBeatPercent * 0.48 +
    Math.min(8, metrics.perfectDodges * 2.0) -
    metrics.damageTaken * 8;

  if (composite >= 95 && metrics.damageTaken === 0) return 'S+';
  if (composite >= 88) return 'S';
  if (composite >= 78) return 'A';
  if (composite >= 65) return 'B';
  if (composite >= 50) return 'C';
  return 'D';
}

export interface Quest3FrameBudget {
  gpuFrameMs: number;
  cpuFrameMs: number;
  estimatedFps: number;
  meets90HzTarget: boolean;
}

export function estimateQuest3FrameBudget(params: {
  foveationLevel: number;
  renderScalePercent: number;
  dynamicResolution: boolean;
  msaaLevel: number;
  activeDrawCalls: number;
}): Quest3FrameBudget {
  const scaleFactor = Math.pow(params.renderScalePercent / 100, 1.65);
  const foveationSavings = 1 - Math.min(4, Math.max(0, params.foveationLevel)) * 0.065;
  const msaaCost = params.msaaLevel === 4 ? 1.08 : params.msaaLevel === 2 ? 1.0 : 0.92;
  const dynResCap = params.dynamicResolution ? 0.94 : 1.0;

  const baseGpuMs = 6.2 * scaleFactor * foveationSavings * msaaCost * dynResCap;
  const cpuFrameMs = 3.1 + params.activeDrawCalls * 0.018;
  const gpuFrameMs = Number(baseGpuMs.toFixed(2));
  const cpuRounded = Number(cpuFrameMs.toFixed(2));
  const bottleneckMs = Math.max(gpuFrameMs, cpuRounded);
  const estimatedFps = Math.min(90, Math.round(1000 / Math.max(11.11, bottleneckMs)));

  return {
    gpuFrameMs,
    cpuFrameMs: cpuRounded,
    estimatedFps,
    meets90HzTarget: bottleneckMs <= 11.11,
  };
}
