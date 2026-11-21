import * as THREE from 'three';
import {
  createDiegeticAmmoDisplay,
  createPistolFinishTexture,
  createRadialGlowTexture,
  type DiegeticAmmoCanvas,
} from './proceduralTextures';
import type { ThreeThemePalette } from './themePalettes';

export interface PistolRig {
  root: THREE.Group;
  slideGroup: THREE.Group;
  muzzleGroup: THREE.Group;
  muzzlePoint: THREE.Object3D;
  laserBeam: THREE.Mesh;
  ammoDisplay: DiegeticAmmoCanvas;
  frameMaterial: THREE.MeshStandardMaterial;
  slideMaterial: THREE.MeshStandardMaterial;
  accentMaterial: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function buildPistolRig(
  isLeft: boolean,
  palette: ThreeThemePalette,
  maxAnisotropy: number
): PistolRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const finishTex = createPistolFinishTexture(palette.pistolPatternStyle, maxAnisotropy);
  textures.push(finishTex);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: finishTex,
    roughness: Math.min(0.95, palette.pistolRoughness + 0.2),
    metalness: Math.max(0.18, palette.pistolMetalness - 0.2),
  });
  const gripDarkMat = new THREE.MeshStandardMaterial({
    color: 0x13161f,
    roughness: 0.78,
    metalness: 0.22,
  });
  const slideMaterial = new THREE.MeshStandardMaterial({
    color: palette.pistolSlideHex,
    roughness: palette.pistolRoughness,
    metalness: palette.pistolMetalness,
  });
  const barrelChromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.14,
    metalness: 0.95,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: palette.pistolAccentHex,
    emissive: palette.pistolAccentHex,
    emissiveIntensity: 1.65,
    roughness: 0.22,
    metalness: 0.4,
  });
  materials.push(frameMaterial, gripDarkMat, slideMaterial, barrelChromeMat, accentMaterial);

  // 1. Lower Tactical Polymer/Alloy Receiver & Angled Ergonomic Grip (points toward -Z)
  const dustcoverGeo = new THREE.BoxGeometry(0.048, 0.032, 0.29);
  const gripGeo = new THREE.BoxGeometry(0.044, 0.145, 0.068);
  const magwellGeo = new THREE.BoxGeometry(0.056, 0.022, 0.082);
  const guardBottomGeo = new THREE.BoxGeometry(0.022, 0.012, 0.072);
  const guardFrontGeo = new THREE.BoxGeometry(0.022, 0.044, 0.012);
  const triggerGeo = new THREE.BoxGeometry(0.012, 0.032, 0.016);
  geometries.push(dustcoverGeo, gripGeo, magwellGeo, guardBottomGeo, guardFrontGeo, triggerGeo);

  const dustcover = new THREE.Mesh(dustcoverGeo, frameMaterial);
  dustcover.position.set(0, -0.018, -0.065);
  root.add(dustcover);

  const grip = new THREE.Mesh(gripGeo, frameMaterial);
  grip.position.set(0, -0.092, 0.062);
  grip.rotation.x = 0.28;
  root.add(grip);

  // Dark rubberized side grip panel inserts
  const gripWrapGeo = new THREE.BoxGeometry(0.048, 0.105, 0.048);
  geometries.push(gripWrapGeo);
  const gripWrap = new THREE.Mesh(gripWrapGeo, gripDarkMat);
  gripWrap.position.set(0, -0.09, 0.062);
  gripWrap.rotation.x = 0.28;
  root.add(gripWrap);

  const magwell = new THREE.Mesh(magwellGeo, gripDarkMat);
  magwell.position.set(0, -0.158, 0.082);
  magwell.rotation.x = 0.28;
  root.add(magwell);

  const guardBottom = new THREE.Mesh(guardBottomGeo, frameMaterial);
  guardBottom.position.set(0, -0.066, -0.008);
  const guardFront = new THREE.Mesh(guardFrontGeo, frameMaterial);
  guardFront.position.set(0, -0.046, -0.042);
  const trigger = new THREE.Mesh(triggerGeo, accentMaterial);
  trigger.position.set(0, -0.042, 0.002);
  trigger.rotation.x = 0.35;
  root.add(guardBottom, guardFront, trigger);

  // 2. Underbarrel Picatinny Laser Module
  const railGeo = new THREE.BoxGeometry(0.038, 0.026, 0.086);
  const laserLensGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.014, 12);
  laserLensGeo.rotateX(Math.PI / 2);
  geometries.push(railGeo, laserLensGeo);

  const railPod = new THREE.Mesh(railGeo, gripDarkMat);
  railPod.position.set(0, -0.042, -0.145);
  const laserLens = new THREE.Mesh(laserLensGeo, accentMaterial);
  laserLens.position.set(0, -0.042, -0.19);
  root.add(railPod, laserLens);

  // 3. Chamfered Top Metal Slide Group (physically kicks backward on fire!)
  const slideGroup = new THREE.Group();
  root.add(slideGroup);

  const slideShape = new THREE.Shape();
  slideShape.moveTo(-0.026, 0);
  slideShape.lineTo(0.026, 0);
  slideShape.lineTo(0.026, 0.036);
  slideShape.lineTo(0.017, 0.048);
  slideShape.lineTo(-0.017, 0.048);
  slideShape.lineTo(-0.026, 0.036);
  slideShape.closePath();

  const slideGeo = new THREE.ExtrudeGeometry(slideShape, {
    depth: 0.30,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  slideGeo.translate(0, 0, -0.22);
  geometries.push(slideGeo);

  const slideMesh = new THREE.Mesh(slideGeo, slideMaterial);
  slideMesh.position.set(0, -0.002, 0.015);
  slideGroup.add(slideMesh);

  // Rear slide cocking serration ribs
  const ribGeo = new THREE.BoxGeometry(0.06, 0.028, 0.006);
  geometries.push(ribGeo);
  for (let i = 0; i < 5; i++) {
    const rib = new THREE.Mesh(ribGeo, gripDarkMat);
    rib.position.set(0, 0.021, 0.038 + i * 0.012);
    slideGroup.add(rib);
  }

  // Side accent trim strips on slide
  const stripeGeo = new THREE.BoxGeometry(0.056, 0.005, 0.16);
  geometries.push(stripeGeo);
  const stripe = new THREE.Mesh(stripeGeo, accentMaterial);
  stripe.position.set(0, 0.012, -0.105);
  slideGroup.add(stripe);

  // Ejection port & Chrome Match Barrel Hood
  const hoodGeo = new THREE.BoxGeometry(0.036, 0.016, 0.054);
  const barrelTipGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.052, 14);
  barrelTipGeo.rotateX(Math.PI / 2);
  geometries.push(hoodGeo, barrelTipGeo);

  const hood = new THREE.Mesh(hoodGeo, barrelChromeMat);
  hood.position.set(0, 0.042, -0.055);
  slideGroup.add(hood);

  const barrelTip = new THREE.Mesh(barrelTipGeo, barrelChromeMat);
  barrelTip.position.set(0, 0.022, -0.215);
  root.add(barrelTip);

  // 4. Glowing Tritium Rear & Front Iron Sights
  const sightPostGeo = new THREE.BoxGeometry(0.01, 0.015, 0.014);
  const sightDotGeo = new THREE.BoxGeometry(0.006, 0.006, 0.005);
  geometries.push(sightPostGeo, sightDotGeo);

  for (const sx of [-0.014, 0.014]) {
    const post = new THREE.Mesh(sightPostGeo, gripDarkMat);
    post.position.set(sx, 0.054, 0.088);
    slideGroup.add(post);

    const dot = new THREE.Mesh(sightDotGeo, accentMaterial);
    dot.position.set(sx, 0.056, 0.096);
    slideGroup.add(dot);
  }
  const frontPost = new THREE.Mesh(sightPostGeo, gripDarkMat);
  frontPost.position.set(0, 0.054, -0.192);
  slideGroup.add(frontPost);
  const frontDot = new THREE.Mesh(sightDotGeo, accentMaterial);
  frontDot.position.set(0, 0.056, -0.185);
  slideGroup.add(frontDot);

  // 5. Crisp Diegetic 3D Ammo Display Plate mounted clearly on rear backplate / top rear
  const ammoDisplay = createDiegeticAmmoDisplay(maxAnisotropy);
  textures.push(ammoDisplay.texture);

  const ammoPlaneGeo = new THREE.PlaneGeometry(0.08, 0.06);
  geometries.push(ammoPlaneGeo);
  const ammoMat = new THREE.MeshBasicMaterial({
    map: ammoDisplay.texture,
    transparent: true,
    depthTest: false,
    side: THREE.FrontSide,
  });
  materials.push(ammoMat);

  const ammoPlate = new THREE.Mesh(ammoPlaneGeo, ammoMat);
  ammoPlate.position.set(isLeft ? 0.008 : -0.008, 0.034, 0.116);
  ammoPlate.rotation.x = -0.16;
  ammoPlate.renderOrder = 15;
  slideGroup.add(ammoPlate);

  // 6. Thin Aiming Laser Beam
  const laserGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 16, 6);
  laserGeo.rotateX(Math.PI / 2);
  laserGeo.translate(0, 0, -8);
  geometries.push(laserGeo);
  const laserMat = new THREE.MeshBasicMaterial({
    color: palette.pistolAccentHex,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(laserMat);
  const laserBeam = new THREE.Mesh(laserGeo, laserMat);
  laserBeam.position.set(0, -0.042, -0.195);
  root.add(laserBeam);

  // 7. Vivid 3D Polygonal Starburst Muzzle Flash
  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.022, -0.25);
  root.add(muzzlePoint);

  const muzzleGroup = new THREE.Group();
  muzzleGroup.position.copy(muzzlePoint.position);
  muzzleGroup.visible = false;
  root.add(muzzleGroup);

  const starShape = new THREE.Shape();
  const spikes = 9;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 0.28 : 0.075;
    const a = (i * Math.PI) / spikes;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(px, py);
    else starShape.lineTo(px, py);
  }
  starShape.closePath();

  const starGeo = new THREE.ShapeGeometry(starShape);
  geometries.push(starGeo);

  const outerFlashMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pinkFlashMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  materials.push(outerFlashMat, pinkFlashMat);

  const flash1 = new THREE.Mesh(starGeo, outerFlashMat);
  const flash2 = new THREE.Mesh(starGeo, pinkFlashMat);
  flash2.rotation.z = 0.35;
  flash2.scale.setScalar(0.75);
  flash2.position.z = -0.02;

  const flash3 = new THREE.Mesh(starGeo, outerFlashMat);
  flash3.rotation.y = Math.PI / 2;
  flash3.scale.set(1.25, 0.72, 1);
  flash3.position.z = -0.09;

  const glowTex = createRadialGlowTexture();
  textures.push(glowTex);
  const glowSpriteMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffffff,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  materials.push(glowSpriteMat);
  const glowSprite = new THREE.Sprite(glowSpriteMat);
  glowSprite.scale.set(0.65, 0.65, 1);

  muzzleGroup.add(flash1, flash2, flash3, glowSprite);

  return {
    root,
    slideGroup,
    muzzleGroup,
    muzzlePoint,
    laserBeam,
    ammoDisplay,
    frameMaterial,
    slideMaterial,
    accentMaterial,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
