export interface ProjectFileEntry {
  path: string;
  name: string;
  folder: string;
  extension: string;
  category: 'Core' | 'Rhythm' | 'VR' | 'Weapons' | 'AI' | 'Level' | 'Systems' | 'UI' | 'Config' | 'Build' | 'Docs';
  lines: number;
  bytes: number;
  content: string;
}

const rawFiles = import.meta.glob('/PulseTriggerVR/**/*', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function classifyCategory(filePath: string): ProjectFileEntry['category'] {
  if (filePath.includes('/Config/')) return 'Config';
  if (filePath.includes('/Build/') || filePath.endsWith('.uproject') || filePath.endsWith('.cs')) return 'Build';
  if (filePath.includes('/Docs/')) return 'Docs';
  if (filePath.includes('/Rhythm/')) return 'Rhythm';
  if (filePath.includes('/VR/')) return 'VR';
  if (filePath.includes('/Weapons/')) return 'Weapons';
  if (filePath.includes('/AI/')) return 'AI';
  if (filePath.includes('/Level/')) return 'Level';
  if (filePath.includes('/Systems/')) return 'Systems';
  if (filePath.includes('/UI/')) return 'UI';
  return 'Core';
}

export function loadProjectFiles(): ProjectFileEntry[] {
  return Object.entries(rawFiles)
    .map(([fullPath, content]) => {
      const cleanPath = fullPath.replace(/^\/PulseTriggerVR\//, '');
      const parts = cleanPath.split('/');
      const name = parts[parts.length - 1] ?? cleanPath;
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Root';
      const extIdx = name.lastIndexOf('.');
      const extension = extIdx >= 0 ? name.slice(extIdx + 1) : '';
      return {
        path: cleanPath,
        name,
        folder,
        extension,
        category: classifyCategory(fullPath),
        lines: content.split('\n').length,
        bytes: content.length,
        content,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export interface BlueprintNodeSpec {
  blueprintName: string;
  parentCppClass: string;
  module: string;
  responsibilities: string[];
  dataAssets: string[];
}

export const BLUEPRINT_HIERARCHY: BlueprintNodeSpec[] = [
  {
    blueprintName: 'BP_PulseGameMode',
    parentCppClass: 'APulseGameMode',
    module: 'Core',
    responsibilities: [
      'Pre-warms ObjectPoolSubsystem buckets (32 tracers, 48 enemy projectiles, 12x per enemy archetype)',
      'Orchestrates Countdown -> Playing -> Paused -> Results transitions',
      'Binds OnSongCompleted and OnPlayerDefeated to SaveManagerSubsystem',
    ],
    dataAssets: ['DA_Track_NeonSyndicate', 'DA_Track_Overdrive'],
  },
  {
    blueprintName: 'BP_VRPlayerPawn',
    parentCppClass: 'AVRPlayerPawn',
    module: 'VR',
    responsibilities: [
      'OpenXR HMD camera with 14cm HeadHitbox and 52cm NearMissDodgeSphere',
      'Left/Right MotionControllerComponent (LeftAim / RightAim) + Enhanced Input IMC_VRGameplay',
      'Mounts Left/Right ASemiAutoPistol based on Right / Left / DualWield setting',
      'Drives VRComfortComponent vignette tunneling and Stage Guardian play-area monitoring',
    ],
    dataAssets: ['IMC_VRGameplay', 'MPC_ComfortVignette'],
  },
  {
    blueprintName: 'BP_SemiAutoPistol',
    parentCppClass: 'ASemiAutoPistol',
    module: 'Weapons',
    responsibilities: [
      'Hitscan raycast + 14cm VR aim magnetism sweep',
      'Acquires pooled ABulletTracerPoolItem from UObjectPoolSubsystem (zero runtime SpawnActor)',
      'Detects downward tilt gesture (-0.65 Z dot) for Pistol Whip style quick reload or Auto-Reload',
      'Triggers OpenXR controller haptic curves and recoil spring interpolation',
    ],
    dataAssets: ['DA_Weapon_SemiAutoPistol'],
  },
  {
    blueprintName: 'BP_Enemy_Archetypes (5 Variants)',
    parentCppClass: 'AEnemyBase -> Normal / Heavy / Melee / Elite / Boss',
    module: 'AI',
    responsibilities: [
      'State Machine (Pooled -> Spawning -> Repositioning -> Telegraphing -> Attacking -> Staggered -> Dead)',
      'Behavior Tree + Blackboard + UEnvQueryContext_PlayerSpline for forward spline lane positioning',
      'Heavy Unit chest armor break + stagger; Melee Charger rush; Elite lateral strafe fan burst; 3-Phase Boss',
    ],
    dataAssets: ['DA_Enemy_Normal', 'DA_Enemy_Heavy', 'DA_Enemy_Melee', 'DA_Enemy_Elite', 'DA_Enemy_Boss'],
  },
  {
    blueprintName: 'BP_LevelDirector & BP_SplineTrack',
    parentCppClass: 'ALevelDirectorActor / ASplineTrackActor',
    module: 'Level',
    responsibilities: [
      'Zero-pitch/roll horizon-locked Spline rail progression for VR vestibular comfort',
      'Command-pattern beat timeline dispatcher spawning enemy waves, dodge obstacles, and cinematic cues',
      'Drives ABeatVisualizerActor updating MPC_BeatPulse scalar shader params at 90Hz',
    ],
    dataAssets: ['DA_Timeline_Stage01', 'MPC_BeatPulse'],
  },
  {
    blueprintName: 'WBP_VRMenus (7 Screens)',
    parentCppClass: 'UPulseMainMenuWidget .. UCalibrationMenuWidget',
    module: 'UI',
    responsibilities: [
      'World-space UWidgetComponent driven by RightWidgetLaser + GazeFallbackPointer',
      'Main Menu, Level Select, VR Comfort Settings, Quest 3 Performance Menu, Pause, Calibration, S+..D Results',
    ],
    dataAssets: ['WBP_MainMenu', 'WBP_ResultsScreen'],
  },
];

export interface PatternMappingSpec {
  pattern: string;
  implementation: string;
  benefit: string;
}

export const DESIGN_PATTERNS: PatternMappingSpec[] = [
  {
    pattern: 'Object Pool Pattern',
    implementation: 'UObjectPoolSubsystem + IPoolableActor (tracers, projectiles, all 5 enemy classes)',
    benefit: 'Zero runtime SpawnActor / Destroy GC spikes during combat, locking 11.11ms Quest 3 budget.',
  },
  {
    pattern: 'Observer Pattern',
    implementation: 'UBeatManagerSubsystem delegates (OnQuarterBeat, OnEighthBeat, OnSixteenthBeat) + UScoringSubsystem',
    benefit: 'Decouples music clock from enemies, shader visualizers, audio stems, and scoring HUD.',
  },
  {
    pattern: 'Factory Pattern',
    implementation: 'UEnemyFactorySubsystem::SpawnEnemyFromArchetype(UEnemyArchetypeDataAsset*)',
    benefit: 'Constructs and initializes pooled enemies from designer Data Assets with zero hardcoded stats.',
  },
  {
    pattern: 'Command Pattern',
    implementation: 'ALevelDirectorActor + FTimelineBeatEvent commands (Waves, Obstacles, Cinematics, Speed)',
    benefit: 'Data-driven level timelines execute deterministically on exact 1/16 beat grid indices.',
  },
  {
    pattern: 'Strategy / State Pattern',
    implementation: 'AEnemyBase EEnemyState machine + AEnemyArchetypes (Normal, Heavy, Melee, Elite, Boss phases)',
    benefit: 'Cleanly isolates per-archetype attack policies, armor absorption, and multi-phase boss transitions.',
  },
  {
    pattern: 'Dependency Injection via Subsystems',
    implementation: 'UGameInstanceSubsystem & UWorldSubsystem (Beat, Pool, Scoring, Audio, Save, EnemyFactory)',
    benefit: 'Removes fragile singleton globals; guarantees deterministic initialization and teardown per world.',
  },
];

export interface QuestOptimizationCheck {
  id: string;
  category: 'Rendering' | 'Memory & CPU' | 'OpenXR & VR' | 'Packaging';
  setting: string;
  value: string;
  rationale: string;
}

export const QUEST3_OPTIMIZATIONS: QuestOptimizationCheck[] = [
  {
    id: 'opt-hdr',
    category: 'Rendering',
    setting: 'r.MobileHDR = False & r.ForwardShading = True',
    value: 'Forward LDR Path',
    rationale: 'Eliminates multi-target deferred G-Buffer bandwidth and tone-mapping resolve on Adreno 740 tile memory.',
  },
  {
    id: 'opt-stereo',
    category: 'Rendering',
    setting: 'vr.InstancedStereo = True & vr.MobileMultiView = True',
    value: 'Single-Pass Stereo',
    rationale: 'Renders both Quest 3 eyes in a single geometry pass, halving vertex shader and draw call CPU submission.',
  },
  {
    id: 'opt-msaa',
    category: 'Rendering',
    setting: 'r.MobileMSAA = 4',
    value: '4x Hardware MSAA',
    rationale: 'Nearly free on tile-based mobile GPUs and essential for razor-sharp neon edges in VR.',
  },
  {
    id: 'opt-ffr',
    category: 'OpenXR & VR',
    setting: 'xr.OpenXR.FoveationLevel = 2 & FFRDynamic = True',
    value: 'Dynamic High-Top FFR',
    rationale: 'Reduces peripheral fragment shading rate without noticeable center-gaze clarity loss.',
  },
  {
    id: 'opt-dynres',
    category: 'OpenXR & VR',
    setting: 'r.DynamicRes.FrameTimeBudget = 10.2',
    value: '85% - 110% Scale',
    rationale: 'Reserves 0.9ms TimeWarp headroom inside the 11.11ms (90Hz) frame window during intense boss waves.',
  },
  {
    id: 'opt-pool',
    category: 'Memory & CPU',
    setting: 'UObjectPoolSubsystem Warmup + r.Streaming.PoolSize = 1024',
    value: 'Zero-GC Combat',
    rationale: 'Prevents Unreal GC hitches and async texture pop-in while moving down the spline at 650 cm/s.',
  },
  {
    id: 'opt-mpc',
    category: 'Rendering',
    setting: 'ABeatVisualizerActor -> MPC_BeatPulse',
    value: 'Zero Dynamic Shadows',
    rationale: 'All beat-reactive neon pulses run in vertex/pixel shaders via MaterialParameterCollection instead of dynamic point lights.',
  },
  {
    id: 'opt-manifest',
    category: 'Packaging',
    setting: 'AndroidManifest_Quest3_UPL.xml (SDK 32, Arm64, Vulkan)',
    value: 'com.oculus.supportedDevices=quest3',
    rationale: 'Ships standalone ASTC APK targeting Meta Quest 3 OpenXR runtime with focus-aware VR activity.',
  },
];
