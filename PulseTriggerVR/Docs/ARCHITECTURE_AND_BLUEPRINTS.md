# Pulse Trigger VR — Unreal Engine 5.4+ Meta Quest 3 Production Architecture

## 1. Folder Structure
- `PulseTriggerVR.uproject` — UE 5.4 project descriptor with OpenXR, MetaXR, Niagara, EnhancedInput, AudioMixer, SignificanceManager
- `Config/DefaultEngine.ini` — Quest 3 Forward Renderer (`r.Mobile.ShadingPath=0`), `r.MobileHDR=False`, `vr.InstancedStereo=True`, `vr.MobileMultiView=True`, `xr.OpenXR.FoveationLevel=2`, Dynamic Resolution (`10.2ms` budget for 90 Hz)
- `Config/Android/AndroidEngine.ini` — Vulkan, LOD distance scale, fixed texture streaming pool (`1024 MB`)
- `Build/Android/AndroidManifest_Quest3_UPL.xml` — Quest 3 `com.oculus.supportedDevices`, `android.hardware.vr.headtracking`, `focusaware`
- `Source/PulseTriggerVR/`
  - `Public/Core/` & `Private/Core/`: `PulseTypes.h`, `IPoolableActor.h`, `ObjectPoolSubsystem`, `PulseGameInstance`, `PulseGameMode`, `PulseGameState`
  - `Public/Rhythm/` & `Private/Rhythm/`: `RhythmDataAssets`, `BeatManagerSubsystem`, `AudioTimelineComponent`, `BeatVisualizerActor`
  - `Public/VR/` & `Private/VR/`: `VRComfortComponent`, `VRPlayerPawn`
  - `Public/Weapons/` & `Private/Weapons/`: `WeaponDataAsset`, `BulletTracerPoolItem`, `WeaponBase`, `SemiAutoPistol`
  - `Public/AI/` & `Private/AI/`: `EnemyDataAsset`, `EnemyProjectilePoolItem`, `EnemyBase`, `EnemyArchetypes` (Normal, Heavy, Melee, Elite, Boss), `EnemyFactorySubsystem`, `EnemyAIController`, `BTTask_FireOnBeat`, `EnvQueryContext_PlayerSpline`
  - `Public/Level/` & `Private/Level/`: `SplineTrackActor`, `TrackProgressionComponent`, `LevelDirectorActor`
  - `Public/Systems/` & `Private/Systems/`: `ScoringSubsystem`, `PulseAudioSubsystem`, `PulseSaveGame`, `SaveManagerSubsystem`
  - `Public/UI/` & `Private/UI/`: `VRMenuWidgets`

## 2. Blueprint Hierarchy
- `BP_PulseGameMode` (extends `APulseGameMode`) -> assigns `BulletTracerPoolClass`, `EnemyPoolClasses`, `DefaultLevelTrack`
- `BP_VRPlayerPawn` (extends `AVRPlayerPawn`) -> binds `IMC_VRGameplay`, `IA_FireLeft`, `IA_FireRight`, `IA_ReloadLeft`, `IA_ReloadRight`, `IA_PauseMenu`, attaches `BP_SemiAutoPistol`
- `BP_SemiAutoPistol` (extends `ASemiAutoPistol`) -> assigns `DA_Weapon_SemiAutoPistol`
- `BP_Enemy_NormalShooter` / `BP_Enemy_Heavy` / `BP_Enemy_MeleeCharger` / `BP_Enemy_Elite` / `BP_BossUnit` -> extend C++ archetypes + bind SkeletalMesh, Animation Blueprint (`ABP_SynthEnemy`), and `BT_EnemyCombat`
- `WBP_MainMenu`, `WBP_LevelSelect`, `WBP_Settings`, `WBP_Performance`, `WBP_Results`, `WBP_Pause`, `WBP_Calibration` -> mounted inside `BP_WorldMenuHost` `UWidgetComponent` (Space: World, 2-sided false, mipmapped UI texture)

## 3. Meta Quest 3 90 FPS Budget (11.11ms Frame Ceiling)
- **Target Frame Budget**: `10.2ms` dynamic resolution ceiling (`0.9ms` headroom for OS compositor/TimeWarp)
- **Rendering**: Forward Shading ON, Mobile HDR OFF, 4x MSAA (hardware tile resolve on Adreno 740), Single-Pass Instanced Stereo + Mobile Multi-View ON
- **Draw Calls**: <= 180 draw calls per eye via Instanced Static Meshes (ISM/HISM), HLODs, and `ABeatVisualizerActor` driving `MPC_BeatPulse` instead of dynamic lights
- **Memory & GC**: Zero runtime `SpawnActor` during combat via `UObjectPoolSubsystem` (tracers, projectiles, all enemy archetypes); `r.Streaming.PoolSize=1024`
- **Audio & Timing**: `UBeatManagerSubsystem` uses PLL drift correction synced against `UAudioComponent::OnAudioPlaybackPercent` (48kHz, 1024-sample buffer)

## 4. Android APK Packaging & Deployment Steps
1. Install Android Studio / SDK 32, NDK r25b (`25.1.8937393`), JDK 17 via Unreal `SetupAndroid.bat`
2. Configure `Edit -> Project Settings -> Platforms -> Android`: Accept SDK License, set Package Name `com.pulsetrigger.vr`, Min/Target SDK `32`, Arm64 ON, Vulkan ON, Package for Meta Quest ON
3. Run Unreal Turnkey / Package Project (`Android ASTC`) in `Shipping` configuration:
   `RunUAT.bat BuildCookRun -project="PulseTriggerVR.uproject" -noP4 -platform=Android -cookflavor=ASTC -clientconfig=Shipping -cook -allmaps -stage -pak -archive -archivedirectory="Builds/Quest3"`
4. Deploy over ADB (`adb install -r Builds/Quest3/Android_ASTC/PulseTriggerVR-arm64.apk`) and profile with **RenderDoc for Meta Quest** + **OVR Metrics Tool** (`90 FPS`, `0 Stale Frames`).
