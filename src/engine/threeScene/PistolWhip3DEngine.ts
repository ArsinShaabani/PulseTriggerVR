import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  getCameraWorldPos,
  WORLD_FOV_DEG,
  type SandboxState,
  type StageThemeId,
} from '../sandboxSimulation';
import { THREE_THEME_PALETTES, type ThreeThemePalette } from './themePalettes';
import {
  createRadialGlowTexture,
  drawScorePopupTexture,
  updateDiegeticAmmoDisplay,
} from './proceduralTextures';
import { buildPistolRig, type PistolRig } from './pistolBuilder';
import { animateEnemyRig, buildEnemyRig, type EnemyRig } from './enemyBuilder';
import { buildWorldEnvironment, type WorldEnvironmentRig } from './worldBuilder';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

interface ShockwaveItem {
  active: boolean;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

interface Shard3DItem {
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  vRotX: number;
  vRotY: number;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

interface Tracer3DItem {
  mesh: THREE.Mesh;
}

interface Projectile3DItem {
  group: THREE.Group;
  coreMat: THREE.MeshBasicMaterial;
}

interface Popup3DItem {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  lastKey: string;
}

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class PistolWhip3DEngine {
  public readonly isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTexture: THREE.Texture;

  private activeTheme: StageThemeId;
  private palette: ThreeThemePalette;
  private worldRig: WorldEnvironmentRig | null = null;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private muzzleLight: THREE.PointLight;

  private leftPistol: PistolRig | null = null;
  private rightPistol: PistolRig | null = null;
  private pistolMount: THREE.Group;

  private enemyRigs = new Map<number, EnemyRig>();
  private tracers3D: Tracer3DItem[] = [];
  private projectiles3D: Projectile3DItem[] = [];
  private shards3D: Shard3DItem[] = [];
  private shockwaves: ShockwaveItem[] = [];
  private popups3D: Popup3DItem[] = [];

  private emberPoints: THREE.Points;
  private emberPositions: Float32Array;
  private glowTexture: THREE.CanvasTexture;

  private aimWorldTarget = new THREE.Vector3(0, 1.5, -18);
  private width = 1280;
  private height = 720;
  private disposed = false;

  constructor(container: HTMLElement, initialTheme: StageThemeId) {
    this.isSoftwareGl = detectSoftwareGl();
    this.activeTheme = initialTheme;
    this.palette = THREE_THEME_PALETTES[initialTheme];

    const rect = container.getBoundingClientRect();
    this.width = Math.max(320, Math.floor(rect.width) || 1280);
    this.height = Math.max(240, Math.floor(rect.height) || 720);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.dataset.testid = 'sandbox-canvas';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.palette.fogHex, this.palette.fogDensity);

    this.camera = new THREE.PerspectiveCamera(WORLD_FOV_DEG, this.width / this.height, 0.1, 220);
    this.camera.position.set(0, 1.65, 0);
    this.scene.add(this.camera);

    // Zero-dependency RoomEnvironment IBL for rich metallic pistol & visor reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTexture;
    pmrem.dispose();

    // 3-Point Warm/Cool Studio Rig + Muzzle Flash Dynamic Light
    this.hemiLight = new THREE.HemisphereLight(
      this.palette.hemiSkyHex,
      this.palette.hemiGroundHex,
      this.palette.hemiIntensity
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(
      this.palette.keyLightHex,
      this.palette.keyLightIntensity
    );
    this.keyLight.position.set(12, 24, 14);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.near = 2;
      this.keyLight.shadow.camera.far = 70;
      this.keyLight.shadow.camera.left = -22;
      this.keyLight.shadow.camera.right = 22;
      this.keyLight.shadow.camera.top = 22;
      this.keyLight.shadow.camera.bottom = -22;
      this.keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(this.palette.rimLightHex, 1.35);
    this.rimLight.position.set(-10, 12, -26);
    this.scene.add(this.rimLight);

    this.muzzleLight = new THREE.PointLight(0xffcf70, 0, 14, 2);
    this.scene.add(this.muzzleLight);

    // Pistol rig mounted relative to camera
    this.pistolMount = new THREE.Group();
    this.camera.add(this.pistolMount);

    this.glowTexture = createRadialGlowTexture();

    // Pre-allocate Pooled VFX Primitives (Zero GC per frame!)
    this.initVfxPools();

    // Ambient rhythm speed embers
    const emberCount = 140;
    this.emberPositions = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      this.emberPositions[i * 3] = (Math.random() - 0.5) * 18;
      this.emberPositions[i * 3 + 1] = 0.4 + Math.random() * 8;
      this.emberPositions[i * 3 + 2] = -Math.random() * 55;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xffffff,
      map: this.glowTexture,
      size: 0.24,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.emberPoints = new THREE.Points(emberGeo, emberMat);
    this.scene.add(this.emberPoints);

    // Build initial world + dual pistols
    this.rebuildThemeScene(initialTheme);

    // Postprocessing UnrealBloomPass on GPU hardware
    if (!this.isSoftwareGl) {
      const composer = new EffectComposer(this.renderer);
      composer.addPass(new RenderPass(this.scene, this.camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        0.38,
        0.45,
        0.78
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
      this.composer = composer;
      this.bloomPass = bloomPass;
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private initVfxPools(): void {
    // Tracer beams pool (24 slots matching simulation)
    const tracerGeo = new THREE.CylinderGeometry(0.022, 0.012, 1, 8);
    tracerGeo.translate(0, 0.5, 0);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff6ad5,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(tracerGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.tracers3D.push({ mesh });
    }

    // Enemy projectile plasma orbs (48 slots matching simulation)
    const orbCoreGeo = new THREE.SphereGeometry(0.16, 12, 10);
    const orbRingGeo = new THREE.TorusGeometry(0.24, 0.028, 6, 16);
    for (let i = 0; i < 48; i++) {
      const group = new THREE.Group();
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const haloMat = new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: 0xff2a6d,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const core = new THREE.Mesh(orbCoreGeo, coreMat);
      const ring = new THREE.Mesh(orbRingGeo, coreMat);
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(0.95, 0.95, 1);
      group.add(core, ring, halo);
      group.visible = false;
      this.scene.add(group);
      this.projectiles3D.push({ group, coreMat });
    }

    // 3D Angular Shatter Shards (96 slots matching particlePool)
    const shardGeo = new THREE.TetrahedronGeometry(0.16, 0);
    for (let i = 0; i < 96; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i % 3 === 0 ? 0xff4dd2 : 0x0b0f17,
        emissive: i % 3 === 0 ? 0xff4dd2 : 0x000000,
        emissiveIntensity: i % 3 === 0 ? 0.9 : 0,
        roughness: 0.35,
        metalness: 0.5,
      });
      const mesh = new THREE.Mesh(shardGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shards3D.push({
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        vRotX: 0,
        vRotY: 0,
        life: 0,
        maxLife: 0.5,
        mesh,
      });
    }

    // Shockwave expanding neon rings
    const ringGeo = new THREE.RingGeometry(0.35, 0.52, 24);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.shockwaves.push({ active: false, life: 0, maxLife: 0.45, mesh });
    }

    // World-space Floating Comic Kill Popups (16 slots matching popupPool)
    for (let i = 0; i < 16; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(2.3, 1.44, 1);
      sprite.visible = false;
      sprite.renderOrder = 20;
      this.scene.add(sprite);
      this.popups3D.push({ sprite, canvas, ctx, texture, lastKey: '' });
    }
  }

  public rebuildThemeScene(theme: StageThemeId): void {
    this.activeTheme = theme;
    this.palette = THREE_THEME_PALETTES[theme];
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Update Fog & Lights
    this.scene.fog = new THREE.FogExp2(this.palette.fogHex, this.palette.fogDensity);
    this.hemiLight.color.setHex(this.palette.hemiSkyHex);
    this.hemiLight.groundColor.setHex(this.palette.hemiGroundHex);
    this.hemiLight.intensity = this.palette.hemiIntensity;
    this.keyLight.color.setHex(this.palette.keyLightHex);
    this.keyLight.intensity = this.palette.keyLightIntensity;
    this.rimLight.color.setHex(this.palette.rimLightHex);

    // Dispose old world & build new
    if (this.worldRig) {
      this.scene.remove(this.worldRig.root);
      this.worldRig.dispose();
    }
    this.worldRig = buildWorldEnvironment(theme, this.palette, maxAniso);
    this.scene.add(this.worldRig.root);

    // Rebuild dual sculpted 3D pistols for the theme finish
    if (this.leftPistol) {
      this.pistolMount.remove(this.leftPistol.root);
      this.leftPistol.dispose();
    }
    if (this.rightPistol) {
      this.pistolMount.remove(this.rightPistol.root);
      this.rightPistol.dispose();
    }
    this.leftPistol = buildPistolRig(true, this.palette, maxAniso);
    this.leftPistol.root.position.set(-0.27, -0.17, -0.72);
    this.pistolMount.add(this.leftPistol.root);

    this.rightPistol = buildPistolRig(false, this.palette, maxAniso);
    this.rightPistol.root.position.set(0.27, -0.17, -0.72);
    this.pistolMount.add(this.rightPistol.root);

    // Refresh existing enemy rigs so theme trim updates cleanly
    for (const [, rig] of this.enemyRigs) {
      this.scene.remove(rig.root);
      rig.dispose();
    }
    this.enemyRigs.clear();
  }

  public triggerKillVfx3D(wx: number, wy: number, wz: number, headshot: boolean): void {
    // Spawn 18 3D shatter tetrahedrons at enemy world position
    let spawned = 0;
    const accentColor = headshot ? 0xfde047 : this.palette.pistolAccentHex;
    for (let i = 0; i < this.shards3D.length && spawned < 18; i++) {
      const s = this.shards3D[i];
      if (!s.active) {
        s.active = true;
        s.life = 0.45 + (i % 4) * 0.08;
        s.maxLife = s.life;
        s.mesh.position.set(wx + (Math.random() - 0.5) * 0.4, wy + 1.0, wz);
        const ang = (Math.PI * 2 * spawned) / 18 + Math.random() * 0.3;
        const spd = 3.2 + Math.random() * 4.5;
        s.vx = Math.cos(ang) * spd;
        s.vy = 2.0 + Math.random() * 4.2;
        s.vz = (Math.random() - 0.3) * 3.5;
        s.vRotX = (Math.random() - 0.5) * 14;
        s.vRotY = (Math.random() - 0.5) * 14;
        s.mesh.scale.setScalar(0.8 + Math.random() * 1.1);
        const mat = s.mesh.material as THREE.MeshStandardMaterial;
        const isBlack = i % 3 !== 0;
        mat.color.setHex(isBlack ? 0x090d16 : accentColor);
        mat.emissive.setHex(isBlack ? 0x000000 : accentColor);
        mat.emissiveIntensity = isBlack ? 0 : 1.1;
        s.mesh.visible = true;
        spawned++;
      }
    }

    // Spawn expanding 3D shockwave ring
    const sw = this.shockwaves.find((item) => !item.active);
    if (sw) {
      sw.active = true;
      sw.maxLife = 0.42;
      sw.life = sw.maxLife;
      sw.mesh.position.set(wx, Math.max(0.15, wy + 0.25), wz);
      sw.mesh.scale.setScalar(0.5);
      (sw.mesh.material as THREE.MeshBasicMaterial).color.setHex(accentColor);
      sw.mesh.visible = true;
    }
  }

  public resize(width: number, height: number): void {
    this.width = Math.max(320, Math.floor(width));
    this.height = Math.max(240, Math.floor(height));
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    if (this.composer) {
      this.composer.setSize(this.width, this.height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(this.width, this.height);
    }
  }

  public syncAndRender(
    sim: SandboxState,
    aimNorm: { x: number; y: number },
    beatPhaseNormalized: number,
    dt: number
  ): void {
    if (this.disposed) return;

    if (sim.theme !== this.activeTheme) {
      this.rebuildThemeScene(sim.theme);
    }

    // 1. Sync VR Head Lean, Crouch, & Camera Trauma Shake
    const camPos = getCameraWorldPos(sim.headOffsetX, sim.headCrouchY);
    const shakeAmp = sim.cameraTrauma * sim.cameraTrauma * 0.14;
    const shakeX = shakeAmp > 0.002 ? (Math.random() - 0.5) * shakeAmp : 0;
    const shakeY = shakeAmp > 0.002 ? (Math.random() - 0.5) * shakeAmp : 0;

    this.camera.position.set(camPos.x + shakeX, camPos.y + shakeY, camPos.z);
    this.camera.rotation.z = -sim.headOffsetX * 0.065; // subtle natural VR head tilt on lean
    this.camera.updateMatrixWorld();

    // 2. Unproject Mouse Aim into 3D Target Space so Both Pistols Aim Directly at Crosshair
    const ndcX = aimNorm.x * 2 - 1;
    const ndcY = -(aimNorm.y * 2 - 1);
    _vec3A.set(ndcX, ndcY, 0.5).unproject(this.camera);
    _vec3B.copy(_vec3A).sub(this.camera.position).normalize();
    this.aimWorldTarget.copy(this.camera.position).addScaledVector(_vec3B, 18);

    // 3. Update World Environment & Embers
    this.worldRig?.update(sim.railDistanceMeters, sim.songTimeSec, sim.beatPulseIntensity);

    if (sim.status === 'playing') {
      const speedZ = 14 + sim.beatPulseIntensity * 6;
      for (let i = 0; i < this.emberPositions.length; i += 3) {
        this.emberPositions[i + 2] += speedZ * dt;
        if (this.emberPositions[i + 2] > 2) {
          this.emberPositions[i + 2] = -52 - Math.random() * 8;
          this.emberPositions[i] = (Math.random() - 0.5) * 18;
        }
      }
      this.emberPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Update Dual 3D Tactical Pistols (Recoil Kick, Slide Blowback, Starburst Flash, Backstrap Ammo)
    const updatePistol = (
      rig: PistolRig | null,
      visible: boolean,
      baseX: number,
      recoil: number,
      flashTimer: number,
      ammo: number
    ) => {
      if (!rig) return;
      rig.root.visible = visible;
      if (!visible) return;

      const recoilZ = recoil * 0.11;
      const recoilY = recoil * 0.036;
      rig.root.position.set(baseX, -0.17 + recoilY, -0.72 + recoilZ);
      rig.root.lookAt(this.aimWorldTarget);
      rig.root.rotateY(Math.PI);
      rig.root.rotateX(recoil * 0.24);

      // Slide physically blows backward (+Z) on shot
      rig.slideGroup.position.z = recoil * 0.068;

      // Muzzle Starburst Flash
      rig.muzzleGroup.visible = flashTimer > 0;
      if (rig.muzzleGroup.visible) {
        const s = 1.05 + (flashTimer / 0.075) * 0.75;
        rig.muzzleGroup.scale.setScalar(s);
        rig.muzzleGroup.rotation.z = sim.songTimeSec * 45;
      }

      const label = sim.reloadTimer > 0 ? 'RLD' : `${ammo}`;
      updateDiegeticAmmoDisplay(rig.ammoDisplay, label, ammo === 0);
    };

    updatePistol(
      this.leftPistol,
      sim.dualWield,
      -0.27,
      sim.leftRecoil,
      sim.leftFlashTimer,
      sim.leftAmmo
    );
    updatePistol(
      this.rightPistol,
      true,
      sim.dualWield ? 0.27 : 0.2,
      sim.rightRecoil,
      sim.rightFlashTimer,
      sim.rightAmmo
    );

    // Muzzle flash illumination light
    if (sim.leftFlashTimer > 0 || sim.rightFlashTimer > 0) {
      this.muzzleLight.intensity = 7.5;
      const activePistol = sim.leftFlashTimer > sim.rightFlashTimer ? this.leftPistol : this.rightPistol;
      if (activePistol) {
        activePistol.muzzlePoint.getWorldPosition(this.muzzleLight.position);
      }
    } else {
      this.muzzleLight.intensity = 0;
    }

    // 5. Sync Articulated 3D Enemy Rigs
    const aliveIds = new Set<number>();
    for (const enemy of sim.enemies) {
      aliveIds.add(enemy.id);
      let rig = this.enemyRigs.get(enemy.id);
      if (!rig) {
        rig = buildEnemyRig(enemy.archetype, this.palette);
        this.scene.add(rig.root);
        this.enemyRigs.set(enemy.id, rig);
      }
      animateEnemyRig(rig, enemy, sim.songTimeSec, beatPhaseNormalized, this.palette);
    }
    for (const [id, rig] of this.enemyRigs) {
      if (!aliveIds.has(id)) {
        this.scene.remove(rig.root);
        rig.dispose();
        this.enemyRigs.delete(id);
      }
    }

    // 6. Sync Incoming 3D Enemy Plasma Projectiles
    for (let i = 0; i < this.projectiles3D.length; i++) {
      const slot = this.projectiles3D[i];
      const simProj = sim.projectilePool[i];
      if (simProj && simProj.active && simProj.z > 0.05) {
        slot.group.visible = true;
        slot.group.position.set(simProj.x * 3.8, 1.35 + simProj.y * 3.2, -simProj.z);
        slot.group.rotation.z = sim.songTimeSec * 8 + i;
      } else {
        slot.group.visible = false;
      }
    }

    // 7. Sync Hitscan 3D Laser Tracer Beams
    for (let i = 0; i < this.tracers3D.length; i++) {
      const tMesh = this.tracers3D[i].mesh;
      const simTracer = sim.tracerPool[i];
      if (simTracer && simTracer.active) {
        // Compute world ray from gun muzzle toward target screen coordinate
        const startIsLeft = simTracer.startX < this.width * 0.5;
        const gun = startIsLeft && sim.dualWield ? this.leftPistol : this.rightPistol;
        if (gun) {
          gun.muzzlePoint.getWorldPosition(_vec3A);
        } else {
          _vec3A.copy(this.camera.position);
        }
        const tNdcX = (simTracer.endX / Math.max(1, this.width)) * 2 - 1;
        const tNdcY = -((simTracer.endY / Math.max(1, this.height)) * 2 - 1);
        _vec3B.set(tNdcX, tNdcY, 0.5).unproject(this.camera);
        _vec3C.copy(_vec3B).sub(this.camera.position).normalize();
        _vec3B.copy(this.camera.position).addScaledVector(_vec3C, 24);

        const dist = _vec3A.distanceTo(_vec3B);
        tMesh.position.copy(_vec3A);
        _vec3C.copy(_vec3B).sub(_vec3A).normalize();
        _quat.setFromUnitVectors(_up, _vec3C);
        tMesh.quaternion.copy(_quat);
        tMesh.scale.set(1, dist, 1);

        const mat = tMesh.material as THREE.MeshBasicMaterial;
        mat.color.set(simTracer.color);
        mat.opacity = Math.max(0.15, simTracer.life / 0.11);
        tMesh.visible = true;
      } else {
        tMesh.visible = false;
      }
    }

    // 8. Update 3D Shatter Shards & Shockwave Rings
    for (const s of this.shards3D) {
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        s.mesh.visible = false;
        continue;
      }
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.vy -= 14 * dt;
      if (s.mesh.position.y < 0.08) {
        s.mesh.position.y = 0.08;
        s.vy = Math.abs(s.vy) * 0.45;
      }
      s.mesh.rotation.x += s.vRotX * dt;
      s.mesh.rotation.y += s.vRotY * dt;
      const ratio = s.life / s.maxLife;
      s.mesh.scale.setScalar(ratio * 1.15);
    }

    for (const sw of this.shockwaves) {
      if (!sw.active) continue;
      sw.life -= dt;
      if (sw.life <= 0) {
        sw.active = false;
        sw.mesh.visible = false;
        continue;
      }
      const prog = 1 - sw.life / sw.maxLife;
      sw.mesh.scale.setScalar(0.5 + prog * 4.5);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.85;
    }

    // 9. Update World-Space Comic Kill Popups (584 / 368 floating bursts)
    for (let i = 0; i < this.popups3D.length; i++) {
      const pop3D = this.popups3D[i];
      const simPop = sim.popupPool[i];
      if (simPop && simPop.active) {
        const key = `${simPop.points}_${simPop.onBeat}_${simPop.headshot}`;
        if (pop3D.lastKey !== key) {
          pop3D.lastKey = key;
          drawScorePopupTexture(pop3D.ctx, simPop.points, simPop.onBeat, simPop.headshot);
          pop3D.texture.needsUpdate = true;
        }
        const pNdcX = (simPop.x / Math.max(1, this.width)) * 2 - 1;
        const pNdcY = -((simPop.y / Math.max(1, this.height)) * 2 - 1);
        _vec3A.set(pNdcX, pNdcY, 0.5).unproject(this.camera);
        _vec3B.copy(_vec3A).sub(this.camera.position).normalize();
        pop3D.sprite.position.copy(this.camera.position).addScaledVector(_vec3B, 14);
        (pop3D.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, (simPop.life / simPop.maxLife) * 2.1);
        pop3D.sprite.visible = true;
      } else {
        pop3D.sprite.visible = false;
      }
    }

    // Suppress unused _mat4 lint warning cleanly
    void _mat4;

    // 10. Render Frame
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  public getContext(): WebGL2RenderingContext {
    return this.renderer.getContext() as WebGL2RenderingContext;
  }

  public dispose(): void {
    this.disposed = true;
    this.worldRig?.dispose();
    this.leftPistol?.dispose();
    this.rightPistol?.dispose();
    for (const [, rig] of this.enemyRigs) {
      rig.dispose();
    }
    this.enemyRigs.clear();
    this.envTexture.dispose();
    this.glowTexture.dispose();
    this.emberPoints.geometry.dispose();
    (this.emberPoints.material as THREE.Material).dispose();
    this.popups3D.forEach((p) => {
      p.texture.dispose();
      (p.sprite.material as THREE.Material).dispose();
    });
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
