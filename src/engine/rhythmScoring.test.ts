import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TIMING_CONFIG,
  applyPerfectDodge,
  applyPlayerDamage,
  applyShotToScore,
  computeBeatGridPosition,
  computeComboMultiplier,
  computePerformanceGrade,
  createInitialScoreMetrics,
  estimateQuest3FrameBudget,
  evaluateBeatAccuracy,
} from './rhythmScoring';

test('computeBeatGridPosition resolves 1/4, 1/8, and 1/16 subdivisions at 120 BPM', () => {
  const cfg = { ...DEFAULT_TIMING_CONFIG, bpm: 120, latencyOffsetMs: 0 };
  // At 120 BPM: 1/4 = 0.5s, 1/8 = 0.25s, 1/16 = 0.125s
  const atQuarter = computeBeatGridPosition(1.0, cfg);
  assert.equal(atQuarter.sixteenthIndex, 8);
  assert.equal(atQuarter.isQuarterBeat, true);
  assert.equal(atQuarter.isEighthBeat, true);

  const atEighth = computeBeatGridPosition(0.25, cfg);
  assert.equal(atEighth.sixteenthIndex, 2);
  assert.equal(atEighth.isQuarterBeat, false);
  assert.equal(atEighth.isEighthBeat, true);

  const atSixteenth = computeBeatGridPosition(0.125, cfg);
  assert.equal(atSixteenth.sixteenthIndex, 1);
  assert.equal(atSixteenth.isQuarterBeat, false);
  assert.equal(atSixteenth.isEighthBeat, false);
  assert.equal(atSixteenth.isSixteenthBeat, true);
});

test('evaluateBeatAccuracy compensates audio latency and scores timing windows', () => {
  const cfg = { ...DEFAULT_TIMING_CONFIG, bpm: 120, latencyOffsetMs: 20 };
  // Beat at 0.500s compensated occurs at raw time 0.520s
  const perfectShot = evaluateBeatAccuracy(0.530, cfg);
  assert.equal(perfectShot.rank, 'Perfect');
  assert.ok(perfectShot.errorMs <= 45);

  const greatShot = evaluateBeatAccuracy(0.590, cfg);
  assert.equal(greatShot.rank, 'Great');

  const offBeatShot = evaluateBeatAccuracy(0.750, cfg);
  assert.equal(offBeatShot.rank, 'OffBeat');
});

test('scoring engine accumulates beat bonus, headshot bonus, combo multiplier, and S+ grade', () => {
  let state = createInitialScoreMetrics();

  for (let i = 0; i < 4; i++) {
    const res = applyShotToScore(state, {
      hit: true,
      headshot: true,
      kill: true,
      beatRank: 'Perfect',
    });
    state = res.next;
  }

  assert.equal(state.currentCombo, 4);
  assert.equal(state.comboMultiplier, 2);
  assert.equal(state.headshots, 4);
  assert.equal(state.onBeatHits, 4);
  assert.equal(state.finalGrade, 'S+');

  const dodgeRes = applyPerfectDodge(state);
  state = dodgeRes.next;
  assert.equal(state.perfectDodges, 1);
  assert.equal(dodgeRes.pointsAwarded, 500);

  // Taking damage resets combo and lowers grade ceiling below S+
  state = applyPlayerDamage(state);
  assert.equal(state.currentCombo, 0);
  assert.equal(state.damageTaken, 1);
  assert.notEqual(computePerformanceGrade(state), 'S+');
});

test('combo multiplier scales across thresholds 1x -> 2x -> 4x -> 8x', () => {
  assert.equal(computeComboMultiplier(0), 1);
  assert.equal(computeComboMultiplier(3), 1);
  assert.equal(computeComboMultiplier(4), 2);
  assert.equal(computeComboMultiplier(12), 4);
  assert.equal(computeComboMultiplier(24), 8);
});

test('Quest 3 frame budget meets 90Hz under recommended settings and flags overload at 140% scale', () => {
  const nominal = estimateQuest3FrameBudget({
    foveationLevel: 2,
    renderScalePercent: 100,
    dynamicResolution: true,
    msaaLevel: 4,
    activeDrawCalls: 160,
  });
  assert.equal(nominal.meets90HzTarget, true);
  assert.equal(nominal.estimatedFps, 90);

  const overloaded = estimateQuest3FrameBudget({
    foveationLevel: 0,
    renderScalePercent: 150,
    dynamicResolution: false,
    msaaLevel: 4,
    activeDrawCalls: 260,
  });
  assert.equal(overloaded.meets90HzTarget, false);
});
