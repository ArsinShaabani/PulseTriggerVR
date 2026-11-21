import * as THREE from 'three';
import type { StageThemeId } from '../sandboxSimulation';
import { createStriatedConcreteTexture, createWalkwayTileTexture } from './proceduralTextures';
import type { ThreeThemePalette } from './themePalettes';

export interface WorldEnvironmentRig {
  root: THREE.Group;
  update: (railDistance: number, songTimeSec: number, beatPulse: number) => void;
  dispose: () => void;
}

const SEGMENT_LENGTH = 10;
const SEGMENT_COUNT = 12;

export function buildWorldEnvironment(
  theme: StageThemeId,
  palette: ThreeThemePalette,
  maxAnisotropy: number
): WorldEnvironmentRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  // 1. Custom Gradient Sky Dome Shader
  const skyGeo = new THREE.SphereGeometry(165, 24, 16);
  geometries.push(skyGeo);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(palette.skyTopHex) },
      uMidColor: { value: new THREE.Color(palette.skyMidHex) },
      uHorizonColor: { value: new THREE.Color(palette.skyHorizonHex) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      varying vec3 vWorldPos;
      void main() {
        float h = clamp(normalize(vWorldPos).y, -0.1, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
        col = mix(col, uTopColor, smoothstep(0.24, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  materials.push(skyMat);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  root.add(skyDome);

  // Horizon Sun / Atmospheric Disc
  const sunGeo = new THREE.CircleGeometry(22, 32);
  geometries.push(sunGeo);
  const sunMat = new THREE.MeshBasicMaterial({
    color: palette.sunHex,
    fog: false,
    transparent: true,
    opacity: theme === 'sunset' ? 0.92 : 0.45,
  });
  materials.push(sunMat);
  const sunDisc = new THREE.Mesh(sunGeo, sunMat);
  sunDisc.position.set(0, 14, -125);
  root.add(sunDisc);

  // 2. Main Tiled Walkway Floor with Infinite UV Scroll
  const floorTex = createWalkwayTileTexture(palette.floorTileBase, palette.floorTileGrout, maxAnisotropy);
  textures.push(floorTex);

  const floorGeo = new THREE.PlaneGeometry(11, SEGMENT_LENGTH * SEGMENT_COUNT);
  floorGeo.rotateX(-Math.PI / 2);
  geometries.push(floorGeo);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: floorTex,
    roughness: 0.72,
    metalness: 0.08,
  });
  materials.push(floorMat);

  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, 0, -52);
  floorMesh.receiveShadow = true;
  root.add(floorMesh);

  // Side Glowing Curb Rails along the Walkway
  const railGeo = new THREE.BoxGeometry(0.16, 0.14, SEGMENT_LENGTH * SEGMENT_COUNT);
  geometries.push(railGeo);
  const railMat = new THREE.MeshStandardMaterial({
    color: palette.beatPadHex,
    emissive: palette.beatPadHex,
    emissiveIntensity: 1.45,
    roughness: 0.25,
    metalness: 0.4,
  });
  materials.push(railMat);

  for (const rx of [-5.45, 5.45]) {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(rx, 0.07, -52);
    root.add(rail);
  }

  // Outer canyon ground skirt so there is zero void gap anywhere
  const outerGroundGeo = new THREE.PlaneGeometry(140, 140);
  outerGroundGeo.rotateX(-Math.PI / 2);
  geometries.push(outerGroundGeo);
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: palette.monolithAccentHex,
    roughness: 0.92,
    metalness: 0.05,
  });
  materials.push(outerGroundMat);
  const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
  outerGround.position.set(0, -0.05, -55);
  root.add(outerGround);

  // 3. Center Beat Pads Scrolling Along Walkway
  const padGeo = new THREE.BoxGeometry(1.55, 0.04, 2.1);
  geometries.push(padGeo);
  const beatPadMat = new THREE.MeshStandardMaterial({
    color: palette.beatPadHex,
    emissive: palette.beatPadHex,
    emissiveIntensity: 1.5,
    roughness: 0.22,
    metalness: 0.2,
  });
  materials.push(beatPadMat);

  const beatPads: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) {
    const pad = new THREE.Mesh(padGeo, beatPadMat);
    pad.position.set(0, 0.025, 4 - i * 7);
    root.add(pad);
    beatPads.push(pad);
  }

  // 4. Stepped Striated Brutalist Architectural Segments (Left & Right)
  const concreteTex = createStriatedConcreteTexture(maxAnisotropy);
  concreteTex.repeat.set(2, 2);
  textures.push(concreteTex);

  const monoMainMat = new THREE.MeshStandardMaterial({
    color: palette.monolithMainHex,
    map: concreteTex,
    roughness: 0.68,
    metalness: 0.12,
  });
  const monoSideMat = new THREE.MeshStandardMaterial({
    color: palette.monolithAccentHex,
    map: concreteTex,
    roughness: 0.78,
    metalness: 0.1,
  });
  const monoCapMat = new THREE.MeshStandardMaterial({
    color: palette.monolithCapHex,
    roughness: 0.45,
    metalness: 0.15,
  });
  const doorwayGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  const palmMat = new THREE.MeshStandardMaterial({
    color: 0x9b5446,
    roughness: 0.85,
    metalness: 0.05,
  });
  const gantryMat = new THREE.MeshStandardMaterial({
    color: 0x10292c,
    roughness: 0.55,
    metalness: 0.65,
  });
  materials.push(monoMainMat, monoSideMat, monoCapMat, doorwayGlowMat, palmMat, gantryMat);

  // Reusable architectural block geometries
  const innerTerraceGeo = new THREE.BoxGeometry(3.8, 2.8, 8.6);
  const capGeo = new THREE.BoxGeometry(4.0, 0.24, 8.8);
  const outerTowerGeo = new THREE.BoxGeometry(7.2, 5.4, 9.4);
  const outerCapGeo = new THREE.BoxGeometry(7.4, 0.3, 9.6);
  const doorGeo = new THREE.BoxGeometry(0.14, 2.4, 1.5);
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 4.8, 6);
  const frondGeo = new THREE.ConeGeometry(0.32, 2.6, 4);
  const gantryPillarGeo = new THREE.BoxGeometry(0.32, 7.6, 0.32);
  geometries.push(
    innerTerraceGeo,
    capGeo,
    outerTowerGeo,
    outerCapGeo,
    doorGeo,
    trunkGeo,
    frondGeo,
    gantryPillarGeo
  );

  // Beat-synced Horizon Neon Arch Frame (adds depth & futuristic action atmosphere)
  const archGeo = new THREE.TorusGeometry(6.8, 0.14, 8, 28, Math.PI);
  geometries.push(archGeo);
  const archMat = new THREE.MeshBasicMaterial({
    color: palette.beatPadGlowHex,
    transparent: true,
    opacity: 0.45,
  });
  materials.push(archMat);
  for (let a = 0; a < 3; a++) {
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, 0, -24 - a * 30);
    root.add(arch);
  }

  const segments: THREE.Group[] = [];

  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const seg = new THREE.Group();
    const zBase = 5 - i * SEGMENT_LENGTH;
    seg.position.set(0, 0, zBase);

    for (const side of [-1, 1]) {
      const innerX = side * 7.6;
      const outerX = side * 12.6;
      const heightMult = theme === 'twilight' ? 1.28 : theme === 'dreadnought' ? 0.65 : 0.92;
      const hVar = (0.72 + ((i + (side > 0 ? 1 : 0)) % 3) * 0.24) * heightMult;
      const tallVar = (0.78 + ((i * 2 + (side > 0 ? 0 : 1)) % 4) * 0.22) * heightMult;

      const innerBlock = new THREE.Mesh(innerTerraceGeo, monoMainMat);
      innerBlock.scale.y = hVar;
      innerBlock.position.set(innerX, 1.4 * hVar, 0);
      innerBlock.receiveShadow = true;
      seg.add(innerBlock);

      const innerCap = new THREE.Mesh(capGeo, monoCapMat);
      innerCap.position.set(innerX, 2.8 * hVar + 0.12, 0);
      seg.add(innerCap);

      const outerTower = new THREE.Mesh(outerTowerGeo, monoSideMat);
      outerTower.scale.y = tallVar;
      outerTower.position.set(outerX, 2.7 * tallVar, 0);
      outerTower.receiveShadow = true;
      seg.add(outerTower);

      const outerCap = new THREE.Mesh(outerCapGeo, monoCapMat);
      outerCap.position.set(outerX, 5.4 * tallVar + 0.15, 0);
      seg.add(outerCap);

      // Glowing pure-white doorway cutouts on Twilight Towers (Image 4 detail!)
      if (theme === 'twilight' && i % 2 === 1) {
        const door = new THREE.Mesh(doorGeo, doorwayGlowMat);
        door.position.set(side * 5.65, 1.22, 0);
        seg.add(door);
      }

      // Curved 3D Stylized Palm Trees perched along Sunset Blvd ridges (Image 1 detail!)
      if (theme === 'sunset' && i % 2 === 0) {
        const palm = new THREE.Group();
        palm.position.set(side * 12.0, 5.4 * tallVar, 0);
        const trunk = new THREE.Mesh(trunkGeo, palmMat);
        trunk.position.y = 2.3;
        trunk.rotation.z = side * -0.14;
        palm.add(trunk);

        for (let f = 0; f < 6; f++) {
          const frond = new THREE.Mesh(frondGeo, palmMat);
          const angle = (f * Math.PI * 2) / 6;
          frond.position.set(side * 0.35 + Math.cos(angle) * 0.95, 4.6, Math.sin(angle) * 0.95);
          frond.rotation.z = Math.cos(angle) * -1.2;
          frond.rotation.x = Math.sin(angle) * 1.2;
          palm.add(frond);
        }
        seg.add(palm);
      }

      // Steel Searchlight Gantry Towers along Dreadnought Deck (Image 2 detail!)
      if (theme === 'dreadnought' && i % 3 === 1) {
        const gantry = new THREE.Mesh(gantryPillarGeo, gantryMat);
        gantry.position.set(side * 6.8, 3.8, 0);
        seg.add(gantry);
      }
    }

    // Floating overhead purple brutalist bridges on Twilight Towers (Image 4 detail!)
    if (theme === 'twilight' && i % 4 === 2) {
      const bridgeGeo = new THREE.BoxGeometry(10.5, 1.4, 2.6);
      geometries.push(bridgeGeo);
      const bridge = new THREE.Mesh(bridgeGeo, monoSideMat);
      bridge.position.set(i % 8 === 2 ? -2.2 : 2.2, 7.8, 0);
      seg.add(bridge);
    }

    root.add(seg);
    segments.push(seg);
  }

  // 5. Sky Dreadnought Hero Aerial Zeppelin + Spinning Propellers + Searchlights
  let zeppelinGroup: THREE.Group | null = null;
  const props: THREE.Group[] = [];
  const searchlights: THREE.Mesh[] = [];

  if (theme === 'dreadnought') {
    zeppelinGroup = new THREE.Group();
    zeppelinGroup.position.set(0, 12.5, -56);

    const hullGeo = new THREE.SphereGeometry(11, 24, 14);
    hullGeo.scale(2.8, 0.68, 0.68);
    const gondolaGeo = new THREE.BoxGeometry(15, 3.6, 4.0);
    const portholeGeo = new THREE.CircleGeometry(1.1, 16);
    const bladeGeo = new THREE.BoxGeometry(0.42, 5.2, 0.16);
    const beamConeGeo = new THREE.ConeGeometry(5.5, 34, 16, 1, true);
    geometries.push(hullGeo, gondolaGeo, portholeGeo, bladeGeo, beamConeGeo);

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0d3640,
      roughness: 0.55,
      metalness: 0.48,
    });
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xa5f3fc,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materials.push(hullMat, beamMat);

    const hull = new THREE.Mesh(hullGeo, hullMat);
    const gondola = new THREE.Mesh(gondolaGeo, hullMat);
    gondola.position.y = -7.5;
    zeppelinGroup.add(hull, gondola);

    for (const px of [-12, -4, 4, 12]) {
      const ph = new THREE.Mesh(portholeGeo, doorwayGlowMat);
      ph.position.set(px, 0.5, 8.6);
      zeppelinGroup.add(ph);
    }

    for (const side of [-1, 1]) {
      const propHub = new THREE.Group();
      propHub.position.set(side * 22, 1.5, 6.2);
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(bladeGeo, gantryMat);
        blade.rotation.z = (b * Math.PI) / 3;
        propHub.add(blade);
      }
      zeppelinGroup.add(propHub);
      props.push(propHub);

      const beam = new THREE.Mesh(beamConeGeo, beamMat);
      beam.position.set(side * 16, -6, 0);
      beam.rotation.z = side * -0.45;
      zeppelinGroup.add(beam);
      searchlights.push(beam);
    }

    root.add(zeppelinGroup);
  }

  return {
    root,
    update: (railDistance: number, songTimeSec: number, beatPulse: number) => {
      // Scroll tiled floor texture smoothly toward camera
      floorTex.offset.y = -(railDistance * 0.22) % 1;

      // Scroll monolith canyon segments seamlessly
      const loopSpan = SEGMENT_LENGTH * SEGMENT_COUNT;
      for (let i = 0; i < segments.length; i++) {
        const rawZ = 5 - i * SEGMENT_LENGTH + (railDistance % loopSpan);
        const wrappedZ = ((rawZ + loopSpan - 12) % loopSpan) - loopSpan + 12;
        segments[i].position.z = wrappedZ;
      }

      // Scroll center beat pads
      const padLoop = 16 * 7;
      for (let i = 0; i < beatPads.length; i++) {
        const rawZ = 4 - i * 7 + (railDistance % padLoop);
        const wrappedZ = ((rawZ + padLoop - 8) % padLoop) - padLoop + 8;
        beatPads[i].position.z = wrappedZ;
      }

      // Pulse glowing beat pads and curb rails with BPM
      beatPadMat.emissiveIntensity = 1.15 + beatPulse * 1.45;
      railMat.emissiveIntensity = 1.0 + beatPulse * 0.9;

      if (zeppelinGroup) {
        zeppelinGroup.position.y = 12.5 + Math.sin(songTimeSec * 0.65) * 0.75;
        for (const p of props) {
          p.rotation.z = songTimeSec * 8.5;
        }
        for (let s = 0; s < searchlights.length; s++) {
          searchlights[s].rotation.z = (s === 0 ? 0.45 : -0.45) + Math.sin(songTimeSec * 1.2 + s) * 0.22;
        }
      }
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
