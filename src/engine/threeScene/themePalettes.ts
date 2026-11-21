import type { StageThemeId } from '../sandboxSimulation';

export interface ThreeThemePalette {
  id: StageThemeId;
  label: string;
  subtitle: string;
  swatch: string;
  skyTopHex: number;
  skyMidHex: number;
  skyHorizonHex: number;
  sunHex: number;
  fogHex: number;
  fogDensity: number;
  keyLightHex: number;
  keyLightIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  rimLightHex: number;
  monolithMainHex: number;
  monolithAccentHex: number;
  monolithCapHex: number;
  floorTileBase: string;
  floorTileGrout: string;
  beatPadHex: number;
  beatPadGlowHex: number;
  pistolFrameHex: number;
  pistolSlideHex: number;
  pistolMetalness: number;
  pistolRoughness: number;
  pistolAccentHex: number;
  pistolPatternStyle: 'camo' | 'brushed' | 'ornamental';
  enemySuitHex: number;
  enemyTrimHex: number;
}

export const THREE_THEME_PALETTES: Record<StageThemeId, ThreeThemePalette> = {
  sunset: {
    id: 'sunset',
    label: 'Sunset Blvd',
    subtitle: 'Golden Palms & Lilac Monoliths',
    swatch: 'linear-gradient(135deg, #ff7a00 0%, #b896cf 100%)',
    skyTopHex: 0xff7b0f,
    skyMidHex: 0xffb338,
    skyHorizonHex: 0xffe49c,
    sunHex: 0xfff8d6,
    fogHex: 0xf4a261,
    fogDensity: 0.011,
    keyLightHex: 0xffe0b2,
    keyLightIntensity: 2.3,
    hemiSkyHex: 0xffca7a,
    hemiGroundHex: 0x6b4c8c,
    hemiIntensity: 1.05,
    rimLightHex: 0xff5e7e,
    monolithMainHex: 0xb693ce,
    monolithAccentHex: 0x7c589c,
    monolithCapHex: 0xead7f6,
    floorTileBase: '#f3ecfc',
    floorTileGrout: '#cab7e2',
    beatPadHex: 0xe60019,
    beatPadGlowHex: 0xff4d62,
    pistolFrameHex: 0x4f7f16,
    pistolSlideHex: 0x1e222b,
    pistolMetalness: 0.55,
    pistolRoughness: 0.36,
    pistolAccentHex: 0xa3e635,
    pistolPatternStyle: 'camo',
    enemySuitHex: 0x1e1b29,
    enemyTrimHex: 0xff3355,
  },
  twilight: {
    id: 'twilight',
    label: 'Twilight Towers',
    subtitle: 'Periwinkle Brutalism & Violet Laser',
    swatch: 'linear-gradient(135deg, #647cd4 0%, #58239c 100%)',
    skyTopHex: 0x5c76d4,
    skyMidHex: 0x8299eb,
    skyHorizonHex: 0xc2d0fc,
    sunHex: 0xf0f5ff,
    fogHex: 0x8d9ee6,
    fogDensity: 0.012,
    keyLightHex: 0xe0e7ff,
    keyLightIntensity: 2.1,
    hemiSkyHex: 0xa5b4fc,
    hemiGroundHex: 0x3b1373,
    hemiIntensity: 1.0,
    rimLightHex: 0xe879f9,
    monolithMainHex: 0x5d24a4,
    monolithAccentHex: 0x38116b,
    monolithCapHex: 0x8b5cf6,
    floorTileBase: '#ded9ef',
    floorTileGrout: '#a79ec7',
    beatPadHex: 0xd946ef,
    beatPadGlowHex: 0xf5d0fe,
    pistolFrameHex: 0x94a3b8,
    pistolSlideHex: 0xcbd5e1,
    pistolMetalness: 0.88,
    pistolRoughness: 0.22,
    pistolAccentHex: 0xf472b6,
    pistolPatternStyle: 'brushed',
    enemySuitHex: 0x1b152b,
    enemyTrimHex: 0xf472b6,
  },
  dreadnought: {
    id: 'dreadnought',
    label: 'Sky Dreadnought',
    subtitle: 'Teal Zeppelin Deck & Starbursts',
    swatch: 'linear-gradient(135deg, #0b5a6b 0%, #fde047 100%)',
    skyTopHex: 0x074152,
    skyMidHex: 0x117488,
    skyHorizonHex: 0x4bc3cf,
    sunHex: 0xcffafe,
    fogHex: 0x208496,
    fogDensity: 0.0105,
    keyLightHex: 0xd8f8ff,
    keyLightIntensity: 2.2,
    hemiSkyHex: 0x67e8f9,
    hemiGroundHex: 0x1f3634,
    hemiIntensity: 1.05,
    rimLightHex: 0xfde047,
    monolithMainHex: 0x2d4a47,
    monolithAccentHex: 0x1a2e2c,
    monolithCapHex: 0x4f726e,
    floorTileBase: '#4d6862',
    floorTileGrout: '#7da199',
    beatPadHex: 0xfef08a,
    beatPadGlowHex: 0xffffff,
    pistolFrameHex: 0x0f3b4c,
    pistolSlideHex: 0x164e63,
    pistolMetalness: 0.78,
    pistolRoughness: 0.28,
    pistolAccentHex: 0x2dd4bf,
    pistolPatternStyle: 'ornamental',
    enemySuitHex: 0xfacc15,
    enemyTrimHex: 0x7e22ce,
  },
};
