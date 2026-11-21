import * as THREE from 'three';

export function createStriatedConcreteTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e8e8ee';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle brutalist fluted vertical grooves
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(x, 0, 3, 256);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x + 3, 0, 2, 256);
  }

  // Horizontal poured concrete joints
  for (let y = 0; y < 256; y += 64) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillRect(0, y, 256, 2);
  }

  // Micro surface grain
  for (let i = 0; i < 900; i++) {
    const gx = (i * 73) % 256;
    const gy = (i * 137) % 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(gx, gy, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWalkwayTileTexture(
  baseColor: string,
  groutColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Clean square architectural tiles (4x4 per repeat)
  ctx.strokeStyle = groutColor;
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    const pos = i * 128;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, 512);
    ctx.moveTo(0, pos);
    ctx.lineTo(512, pos);
    ctx.stroke();
  }

  // Subtle diagonal bevel glint inside each tile
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      ctx.strokeRect(gx * 128 + 4, gy * 128 + 4, 120, 120);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 18);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPistolFinishTexture(
  style: 'camo' | 'brushed' | 'ornamental',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (style === 'camo') {
    ctx.fillStyle = '#5a8f1b';
    ctx.fillRect(0, 0, 256, 256);
    const blobs = [
      [30, 40, 52, 26, '#28400c'],
      [140, 25, 64, 34, '#365810'],
      [90, 115, 70, 32, '#203208'],
      [185, 165, 58, 40, '#78b326'],
      [35, 190, 62, 34, '#32520e'],
      [120, 220, 55, 28, '#1a2907'],
    ] as const;
    for (const [bx, by, bw, bh, col] of blobs) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(bx, by, bw, bh, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === 'brushed') {
    ctx.fillStyle = '#b4c0d0';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(30,41,59,0.08)';
      ctx.fillRect(0, y, 256, 1);
    }
  } else {
    // Ornamental engraved teal filigree (inspired by Image 2)
    ctx.fillStyle = '#0f3b4c';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    for (let x = 32; x < 256; x += 64) {
      for (let y = 32; y < 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 10, y - 10, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createRadialGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.28, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0.22)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface DiegeticAmmoCanvas {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  lastText: string;
}

export function createDiegeticAmmoDisplay(maxAnisotropy: number): DiegeticAmmoCanvas {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;

  const display: DiegeticAmmoCanvas = {
    canvas,
    ctx,
    texture,
    lastText: '',
  };
  updateDiegeticAmmoDisplay(display, '15', false);
  return display;
}

export function updateDiegeticAmmoDisplay(
  display: DiegeticAmmoCanvas,
  label: string,
  empty: boolean
): void {
  const key = `${label}_${empty ? '1' : '0'}`;
  if (display.lastText === key) return;
  display.lastText = key;

  const { ctx, canvas, texture } = display;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = 'italic 900 66px Outfit, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#090d16';
  ctx.strokeText(label, 64, 50);

  ctx.fillStyle = empty ? '#fb7185' : '#ffffff';
  ctx.fillText(label, 64, 50);
  texture.needsUpdate = true;
}

export function drawScorePopupTexture(
  ctx: CanvasRenderingContext2D,
  points: number,
  onBeat: boolean,
  headshot: boolean
): void {
  ctx.clearRect(0, 0, 256, 160);
  ctx.save();
  ctx.translate(128, 80);

  // Jagged black comic burst backing (matches Image 1 "584" and Image 4 "368")
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.moveTo(-78, -46);
  ctx.lineTo(-18, -56);
  ctx.lineTo(28, -62);
  ctx.lineTo(82, -38);
  ctx.lineTo(64, 24);
  ctx.lineTo(86, 46);
  ctx.lineTo(4, 42);
  ctx.lineTo(-64, 50);
  ctx.lineTo(-52, 8);
  ctx.closePath();
  ctx.fill();

  ctx.font = 'italic 900 44px Outfit, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = headshot ? '#fde047' : '#ffffff';
  ctx.fillText(`${Math.round(points)}`, 0, -14);

  // Target circle
  ctx.strokeStyle = onBeat ? '#f472b6' : '#94a3b8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(-22, 22, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-22, 22, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Beat wave glyph
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, 22);
  ctx.lineTo(10, 22);
  ctx.lineTo(16, 10);
  ctx.lineTo(24, 34);
  ctx.lineTo(31, 14);
  ctx.lineTo(38, 22);
  ctx.stroke();

  ctx.restore();
}
