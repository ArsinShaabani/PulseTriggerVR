import * as THREE from 'three';
import type { EnemyArchetype } from '../rhythmScoring';
import type { SimEnemy } from '../sandboxSimulation';
import type { ThreeThemePalette } from './themePalettes';

export interface EnemyRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  pedestalGroup: THREE.Group;
  telegraphRing: THREE.Mesh;
  laserSight: THREE.Mesh;
  shieldMesh?: THREE.Mesh;
  bossCrown?: THREE.Group;
  primaryMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  visorMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function buildEnemyRig(
  archetype: EnemyArchetype,
  palette: ThreeThemePalette
): EnemyRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Archetype distinct high-contrast color schemes
  let suitColor = palette.enemySuitHex;
  let accentColor = palette.enemyTrimHex;
  let visorColor = 0xfef08a;
  let scaleFactor = 1.2;

  if (archetype === 'HeavyUnit') {
    suitColor = 0x1e293b;
    accentColor = 0x38bdf8;
    visorColor = 0x67e8f9;
    scaleFactor = 1.38;
  } else if (archetype === 'MeleeCharger') {
    suitColor = 0x7f1d1d;
    accentColor = 0xf97316;
    visorColor = 0xfde047;
    scaleFactor = 1.22;
  } else if (archetype === 'EliteUnit') {
    suitColor = 0x3b0764;
    accentColor = 0xf472b6;
    visorColor = 0xffffff;
    scaleFactor = 1.28;
  } else if (archetype === 'BossUnit') {
    suitColor = 0x31105c;
    accentColor = 0xfacc15;
    visorColor = 0xff2a6d;
    scaleFactor = 1.65;
  }

  const primaryMat = new THREE.MeshStandardMaterial({
    color: suitColor,
    roughness: 0.42,
    metalness: 0.48,
  });
  const darkJointMat = new THREE.MeshStandardMaterial({
    color: 0x0f1219,
    roughness: 0.72,
    metalness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.5,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: visorColor,
    emissive: visorColor,
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.2,
  });
  materials.push(primaryMat, darkJointMat, accentMat, visorMat);

  // Floating Brutalist Stone Pedestal (sits at y <= 0 below enemy boots)
  const pedestalGroup = new THREE.Group();
  pedestalGroup.visible = false;
  root.add(pedestalGroup);

  const pedTopGeo = new THREE.BoxGeometry(1.5, 0.18, 1.5);
  const pedCoreGeo = new THREE.CylinderGeometry(0.62, 0.42, 0.45, 6);
  const pedTrimGeo = new THREE.BoxGeometry(1.54, 0.05, 1.54);
  geometries.push(pedTopGeo, pedCoreGeo, pedTrimGeo);

  const pedMat = new THREE.MeshStandardMaterial({
    color: palette.monolithMainHex,
    roughness: 0.75,
    metalness: 0.1,
  });
  materials.push(pedMat);

  const pedTop = new THREE.Mesh(pedTopGeo, pedMat);
  pedTop.position.y = -0.09;
  const pedCore = new THREE.Mesh(pedCoreGeo, darkJointMat);
  pedCore.position.y = -0.4;
  const pedTrim = new THREE.Mesh(pedTrimGeo, accentMat);
  pedTrim.position.y = -0.19;
  pedestalGroup.add(pedTop, pedCore, pedTrim);

  // Ground Contact Shadow Disc
  const shadowGeo = new THREE.CircleGeometry(0.55 * scaleFactor, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070d,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  materials.push(shadowMat);
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  // Main Articulated Body Pivot
  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(scaleFactor);
  root.add(bodyPivot);

  // 1. Articulated Legs (Left & Right Thigh + Shin Guard + Combat Boot)
  const makeLeg = (side: -1 | 1): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.17, 0.88, 0);

    const thighGeo = new THREE.BoxGeometry(0.16, 0.42, 0.18);
    const shinGeo = new THREE.BoxGeometry(0.14, 0.42, 0.16);
    const kneeGeo = new THREE.BoxGeometry(0.16, 0.11, 0.07);
    const bootGeo = new THREE.BoxGeometry(0.17, 0.12, 0.28);
    geometries.push(thighGeo, shinGeo, kneeGeo, bootGeo);

    const thigh = new THREE.Mesh(thighGeo, primaryMat);
    thigh.position.y = -0.21;
    const shin = new THREE.Mesh(shinGeo, darkJointMat);
    shin.position.y = -0.6;
    const knee = new THREE.Mesh(kneeGeo, accentMat);
    knee.position.set(0, -0.42, 0.09);
    const boot = new THREE.Mesh(bootGeo, primaryMat);
    boot.position.set(0, -0.82, 0.05);

    leg.add(thigh, shin, knee, boot);
    return leg;
  };

  const leftLegGroup = makeLeg(-1);
  const rightLegGroup = makeLeg(1);
  bodyPivot.add(leftLegGroup, rightLegGroup);

  // 2. Pelvis Utility Belt
  const pelvisGeo = new THREE.BoxGeometry(0.46, 0.18, 0.28);
  const buckleGeo = new THREE.BoxGeometry(0.12, 0.09, 0.04);
  geometries.push(pelvisGeo, buckleGeo);
  const pelvis = new THREE.Mesh(pelvisGeo, darkJointMat);
  pelvis.position.y = 0.94;
  const buckle = new THREE.Mesh(buckleGeo, accentMat);
  buckle.position.set(0, 0.94, 0.15);
  bodyPivot.add(pelvis, buckle);

  // 3. Sculpted Armored Torso Group
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 1.02, 0);
  bodyPivot.add(torsoGroup);

  const chestShape = new THREE.Shape();
  chestShape.moveTo(-0.22, 0);
  chestShape.lineTo(0.22, 0);
  chestShape.lineTo(0.30, 0.48);
  chestShape.lineTo(0.16, 0.58);
  chestShape.lineTo(-0.16, 0.58);
  chestShape.lineTo(-0.30, 0.48);
  chestShape.closePath();

  const chestGeo = new THREE.ExtrudeGeometry(chestShape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  chestGeo.translate(0, 0, -0.14);
  geometries.push(chestGeo);
  const chestMesh = new THREE.Mesh(chestGeo, primaryMat);
  torsoGroup.add(chestMesh);

  // Glowing Chest Seam Reactor Core
  const coreGeo = new THREE.BoxGeometry(0.14, 0.32, 0.32);
  geometries.push(coreGeo);
  const chestCore = new THREE.Mesh(coreGeo, accentMat);
  chestCore.position.set(0, 0.30, 0.02);
  torsoGroup.add(chestCore);

  // Angular Shoulder Pauldrons
  const pauldronGeo = new THREE.BoxGeometry(0.22, 0.18, 0.30);
  geometries.push(pauldronGeo);
  const leftPauldron = new THREE.Mesh(pauldronGeo, primaryMat);
  leftPauldron.position.set(-0.34, 0.48, 0);
  leftPauldron.rotation.z = 0.24;
  const rightPauldron = new THREE.Mesh(pauldronGeo, primaryMat);
  rightPauldron.position.set(0.34, 0.48, 0);
  rightPauldron.rotation.z = -0.24;
  torsoGroup.add(leftPauldron, rightPauldron);

  // Elite / Boss Back Fins
  if (archetype === 'EliteUnit' || archetype === 'BossUnit') {
    const finGeo = new THREE.ConeGeometry(0.09, 0.52, 4);
    geometries.push(finGeo);
    for (const sx of [-0.22, 0.22]) {
      const fin = new THREE.Mesh(finGeo, accentMat);
      fin.position.set(sx, 0.55, -0.16);
      fin.rotation.z = sx < 0 ? 0.35 : -0.35;
      fin.rotation.x = -0.25;
      torsoGroup.add(fin);
    }
  }

  // 4. Sculpted Helmet Head Group (Target for Headshots)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.66, 0);
  torsoGroup.add(headGroup);

  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8);
  const skullGeo = new THREE.OctahedronGeometry(0.18, 1);
  skullGeo.scale(0.9, 1.15, 1.0);
  const visorGeo = new THREE.BoxGeometry(0.26, 0.08, 0.18);
  const crestGeo = new THREE.BoxGeometry(0.06, 0.12, 0.28);
  geometries.push(neckGeo, skullGeo, visorGeo, crestGeo);

  const neck = new THREE.Mesh(neckGeo, darkJointMat);
  neck.position.y = -0.02;
  const helmet = new THREE.Mesh(skullGeo, primaryMat);
  helmet.position.y = 0.14;
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.15, 0.09);
  const crest = new THREE.Mesh(crestGeo, accentMat);
  crest.position.set(0, 0.29, -0.01);

  headGroup.add(neck, helmet, visor, crest);

  // Boss Floating Energy Crown
  let bossCrown: THREE.Group | undefined;
  if (archetype === 'BossUnit') {
    bossCrown = new THREE.Group();
    bossCrown.position.y = 0.42;
    const ringGeo = new THREE.TorusGeometry(0.32, 0.026, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    geometries.push(ringGeo);
    const ring = new THREE.Mesh(ringGeo, accentMat);
    bossCrown.add(ring);
    headGroup.add(bossCrown);
  }

  // 5. Left Arm (holds glowing Holographic Riot Shield on Heavy/Boss, or stabilizing hand / energy blade)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.34, 0.44, 0);
  torsoGroup.add(leftArmGroup);

  const upperArmGeo = new THREE.BoxGeometry(0.13, 0.34, 0.14);
  const foreArmGeo = new THREE.BoxGeometry(0.11, 0.32, 0.12);
  geometries.push(upperArmGeo, foreArmGeo);

  const lUpper = new THREE.Mesh(upperArmGeo, darkJointMat);
  lUpper.position.y = -0.15;
  const lFore = new THREE.Mesh(foreArmGeo, primaryMat);
  lFore.position.set(0, -0.34, 0.14);
  lFore.rotation.x = -0.9;
  leftArmGroup.add(lUpper, lFore);

  let shieldMesh: THREE.Mesh | undefined;
  if (archetype === 'HeavyUnit' || archetype === 'BossUnit') {
    const shieldGeo = new THREE.BoxGeometry(0.68, 1.05, 0.05);
    geometries.push(shieldGeo);
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.58,
      roughness: 0.12,
      metalness: 0.2,
    });
    materials.push(shieldMat);
    shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.set(-0.08, -0.18, 0.38);
    leftArmGroup.add(shieldMesh);
  } else if (archetype === 'MeleeCharger') {
    const bladeGeo = new THREE.ConeGeometry(0.055, 0.62, 4);
    bladeGeo.rotateX(Math.PI / 2);
    geometries.push(bladeGeo);
    const blade = new THREE.Mesh(bladeGeo, accentMat);
    blade.position.set(0, -0.4, 0.45);
    leftArmGroup.add(blade);
  }

  // 6. Right Aiming Arm + Enemy Tactical Weapon + Telegraph Ring + Thin Laser Sight
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.34, 0.44, 0);
  torsoGroup.add(rightArmGroup);

  const rUpper = new THREE.Mesh(upperArmGeo, darkJointMat);
  rUpper.position.y = -0.14;
  const rFore = new THREE.Mesh(foreArmGeo, primaryMat);
  rFore.position.set(0, -0.18, 0.22);
  rFore.rotation.x = -Math.PI / 2;
  rightArmGroup.add(rUpper, rFore);

  if (archetype === 'MeleeCharger') {
    const rBladeGeo = new THREE.ConeGeometry(0.055, 0.62, 4);
    rBladeGeo.rotateX(Math.PI / 2);
    geometries.push(rBladeGeo);
    const rBlade = new THREE.Mesh(rBladeGeo, accentMat);
    rBlade.position.set(0, -0.18, 0.58);
    rightArmGroup.add(rBlade);
  } else {
    const gunGeo = new THREE.BoxGeometry(0.07, 0.11, 0.36);
    geometries.push(gunGeo);
    const gunMesh = new THREE.Mesh(gunGeo, darkJointMat);
    gunMesh.position.set(0, -0.16, 0.44);
    rightArmGroup.add(gunMesh);
  }

  // Glowing Telegraph Charge Ring around gun muzzle
  const ringGeo = new THREE.TorusGeometry(0.32, 0.025, 8, 24);
  geometries.push(ringGeo);
  const teleMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(teleMat);
  const telegraphRing = new THREE.Mesh(ringGeo, teleMat);
  telegraphRing.position.set(0, -0.16, 0.62);
  telegraphRing.visible = false;
  rightArmGroup.add(telegraphRing);

  // Enemy Aiming Laser Sight extending toward player (+Z in enemy local space)
  const laserGeo = new THREE.CylinderGeometry(0.01, 0.01, 24, 6);
  laserGeo.rotateX(Math.PI / 2);
  laserGeo.translate(0, 0, 12);
  geometries.push(laserGeo);
  const laserMat = new THREE.MeshBasicMaterial({
    color: 0xff2a85,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(laserMat);
  const laserSight = new THREE.Mesh(laserGeo, laserMat);
  laserSight.position.set(0, -0.16, 0.6);
  laserSight.visible = false;
  rightArmGroup.add(laserSight);

  return {
    root,
    bodyPivot,
    torsoGroup,
    headGroup,
    leftArmGroup,
    rightArmGroup,
    leftLegGroup,
    rightLegGroup,
    pedestalGroup,
    telegraphRing,
    laserSight,
    shieldMesh,
    bossCrown,
    primaryMat,
    accentMat,
    visorMat,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}

export function animateEnemyRig(
  rig: EnemyRig,
  enemy: SimEnemy,
  songTimeSec: number,
  beatPhaseNormalized: number,
  palette: ThreeThemePalette
): void {
  // Position in 3D world space aligned with sandboxSimulation constants
  const worldX = enemy.laneX * 3.8;
  const worldY = enemy.heightY * 3.2;
  const worldZ = -enemy.depthZ;

  rig.root.position.set(worldX, worldY, worldZ);
  rig.pedestalGroup.visible = enemy.heightY > 0.08 && enemy.state !== 'Dead';

  // Shield visibility vs broken armor
  if (rig.shieldMesh) {
    rig.shieldMesh.visible = enemy.armor > 0 && enemy.state !== 'Dead';
  }

  // Hit flash white highlight
  if (enemy.hitFlashTimer > 0) {
    rig.primaryMat.color.setHex(0xffffff);
    rig.primaryMat.emissive.setHex(0xffffff);
    rig.primaryMat.emissiveIntensity = 0.65;
  } else {
    rig.primaryMat.emissive.setHex(0x000000);
    rig.primaryMat.emissiveIntensity = 0;
    const baseHex =
      enemy.archetype === 'HeavyUnit'
        ? 0x1e293b
        : enemy.archetype === 'MeleeCharger'
          ? 0x7f1d1d
          : enemy.archetype === 'EliteUnit'
            ? 0x3b0764
            : enemy.archetype === 'BossUnit'
              ? 0x31105c
              : palette.enemySuitHex;
    rig.primaryMat.color.setHex(baseHex);
  }

  // Death shatter tumble animation
  if (enemy.state === 'Dead') {
    const t = 1 - Math.max(0, enemy.koTimer / 0.32);
    rig.bodyPivot.position.y = -t * 0.45;
    rig.bodyPivot.rotation.x = t * 1.1;
    rig.bodyPivot.rotation.z = t * 0.55;
    rig.bodyPivot.scale.setScalar(Math.max(0.05, 1 - t * 0.65));
    rig.telegraphRing.visible = false;
    rig.laserSight.visible = false;
    return;
  }

  // Alive pose & rhythm-reactive idle/stride kinematics
  const strideSpeed = enemy.archetype === 'MeleeCharger' ? 9.5 : 4.2;
  const phase = songTimeSec * strideSpeed + enemy.id * 1.7;
  const strideAmp = enemy.archetype === 'MeleeCharger' ? 0.55 : enemy.depthZ > 11.6 ? 0.25 : 0.08;

  rig.leftLegGroup.rotation.x = Math.sin(phase) * strideAmp;
  rig.rightLegGroup.rotation.x = -Math.sin(phase) * strideAmp;

  const beatBounce = Math.max(0, 1 - beatPhaseNormalized * 2.5) * 0.055;
  rig.bodyPivot.position.y = beatBounce;
  rig.bodyPivot.rotation.set(
    enemy.archetype === 'MeleeCharger' ? 0.25 : 0,
    Math.atan2(-worldX, enemy.depthZ) * 0.45,
    0
  );

  // Aim right arm toward player camera
  rig.rightArmGroup.rotation.x = enemy.state === 'Telegraphing' || enemy.state === 'Attacking' ? -0.12 : 0.22;
  rig.rightArmGroup.rotation.y = Math.atan2(-worldX, enemy.depthZ) * 0.45;

  // Telegraph ring + additive laser sight
  const showTelegraph = enemy.state === 'Telegraphing' || enemy.state === 'Attacking';
  rig.telegraphRing.visible = showTelegraph && enemy.archetype !== 'MeleeCharger';
  rig.laserSight.visible = showTelegraph && enemy.archetype !== 'MeleeCharger';
  if (rig.telegraphRing.visible) {
    const pulse = 0.8 + Math.sin(songTimeSec * 22) * 0.25;
    rig.telegraphRing.scale.setScalar(pulse);
  }

  if (rig.bossCrown) {
    rig.bossCrown.rotation.y = songTimeSec * 2.2;
    rig.bossCrown.position.y = 0.42 + Math.sin(songTimeSec * 4) * 0.04;
  }
}
