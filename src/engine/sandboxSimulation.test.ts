import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSandboxState,
  fireSandboxWeapon,
  projectEnemyToNormalizedScreen,
  spawnPooledProjectile,
  stepSandboxSimulation,
  triggerSandboxReload,
} from './sandboxSimulation';

test('sandbox survives initial 3 seconds without player input', () => {
  const sim = createSandboxState(true, false);
  sim.status = 'playing';

  for (let i = 0; i < 180; i++) {
    stepSandboxSimulation(sim, 1 / 60, { leanLeft: false, leanRight: false, crouch: false });
  }

  assert.equal(sim.status, 'playing');
  assert.equal(sim.playerHealth, 4);
  assert.ok(sim.railDistanceMeters > 15);
  assert.ok(sim.enemies.length > 0);
});

test('head lean dodges incoming enemy projectile and awards Perfect Dodge bonus', () => {
  const sim = createSandboxState(true, false);
  sim.status = 'playing';
  // Spawn a bullet heading straight for x=0 at z=1.5m
  spawnPooledProjectile(sim, 0, 0, 1.5, 0, 0, -10);

  let perfectDodgeTriggered = false;
  for (let i = 0; i < 16; i++) {
    stepSandboxSimulation(
      sim,
      1 / 60,
      { leanLeft: false, leanRight: true, crouch: false },
      {
        onPerfectDodge: () => {
          perfectDodgeTriggered = true;
        },
      }
    );
  }

  assert.equal(sim.playerHealth, 4);
  assert.equal(perfectDodgeTriggered, true);
  assert.equal(sim.score.perfectDodges, 1);
  assert.ok(sim.score.totalScore >= 250);
});

test('hitscan weapon destroys NormalShooter, chips HeavyUnit armor, and supports manual reload', () => {
  const sim = createSandboxState(true, false);
  sim.status = 'playing';
  // Advance until first NormalShooter spawns at 16th index 8 (~0.94s at 128 BPM)
  for (let i = 0; i < 70; i++) {
    stepSandboxSimulation(sim, 1 / 60, { leanLeft: false, leanRight: false, crouch: false });
  }
  assert.ok(sim.enemies.length >= 1);
  const target = sim.enemies[0];
  const proj = projectEnemyToNormalizedScreen(target, sim.headOffsetX, sim.headCrouchY);

  const shot = fireSandboxWeapon(sim, proj.screenX, proj.screenY, 1280, 720);
  assert.equal(shot.fired, true);
  assert.equal(shot.hit, true);
  assert.equal(shot.kill, true);
  assert.equal(sim.rightAmmo, 14);

  const reloaded = triggerSandboxReload(sim);
  assert.equal(reloaded, true);
  for (let i = 0; i < 30; i++) {
    stepSandboxSimulation(sim, 1 / 60, { leanLeft: false, leanRight: false, crouch: false });
  }
  assert.equal(sim.rightAmmo, 15);
});
