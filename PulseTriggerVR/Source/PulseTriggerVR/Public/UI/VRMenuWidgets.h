#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "Core/PulseTypes.h"
#include "VRMenuWidgets.generated.h"

class URhythmTrackDataAsset;

/** Base VR world-space menu widget supporting controller laser & gaze hover cues. */
UCLASS(Abstract)
class PULSETRIGGERVR_API UVRMenuWidgetBase : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent, Category = "VRUI")
    void OnMenuShown();
};

/** Main Menu: Play, Level Select, Settings, Calibration, Performance, Quit. */
UCLASS()
class PULSETRIGGERVR_API UPulseMainMenuWidget : public UVRMenuWidgetBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "VRUI|MainMenu")
    void LaunchTrack(URhythmTrackDataAsset* TrackAsset, EMusicDifficulty Difficulty, FName LevelMapName);
};

/** Level Selection Menu reading URhythmTrackDataAsset entries and high score records. */
UCLASS()
class PULSETRIGGERVR_API ULevelSelectWidget : public UVRMenuWidgetBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "VRUI|LevelSelect")
    bool GetTrackBestRecord(FName TrackId, EMusicDifficulty Difficulty, FLevelScoreRecord& OutRecord) const;
};

/** VR Gameplay & Comfort Settings (Seated/Standing, Handedness, Auto-Reload, Vignette, Latency). */
UCLASS()
class PULSETRIGGERVR_API USettingsWidget : public UVRMenuWidgetBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "VRUI|Settings")
    FPlayerVRSettings LoadEditableSettings() const;

    UFUNCTION(BlueprintCallable, Category = "VRUI|Settings")
    void CommitSettings(const FPlayerVRSettings& UpdatedSettings);
};

/** Quest 3 Performance Menu (Foveated Rendering FFR Level, Dynamic Resolution, Render Scale). */
UCLASS()
class PULSETRIGGERVR_API UPerformanceMenuWidget : public UVRMenuWidgetBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "VRUI|Performance")
    void ApplyQuestPerformanceOptions(int32 FoveationLevel, float RenderScalePercent, bool bDynamicResolution);
};

/** End-of-Run Results Screen displaying Score, Accuracy, Max Combo, Perfect Dodges, and Grade (S+..D). */
UCLASS()
class PULSETRIGGERVR_API UResultsScreenWidget : public UVRMenuWidgetBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category = "VRUI|Results")
    FScoreBreakdown GetFinalScoreBreakdown() const;

    UFUNCTION(BlueprintCallable, Category = "VRUI|Results")
    void RetryLevel();

    UFUNCTION(BlueprintCallable, Category = "VRUI|Results")
    void ReturnToMainMenu();
};

/** Pause Menu triggered in-run via OpenXR Menu button. */
UCLASS()
class PULSETRIGGERVR_API UPauseMenuWidget : public UVRMenuWidgetBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "VRUI|Pause")
    void ResumeGame();

    UFUNCTION(BlueprintCallable, Category = "VRUI|Pause")
    void RestartGame();

    UFUNCTION(BlueprintCallable, Category = "VRUI|Pause")
    void QuitToMainMenu();
};

/** Calibration Menu for Height Calibration and Audio-Visual Beat Latency Offset. */
UCLASS()
class PULSETRIGGERVR_API UCalibrationMenuWidget : public UVRMenuWidgetBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "VRUI|Calibration")
    void CalibratePlayerHeightNow();

    UFUNCTION(BlueprintCallable, Category = "VRUI|Calibration")
    void SetBeatLatencyOffsetMs(float OffsetMs);
};

/**
 * Stylized diegetic combat HUD mirroring the lower-left Heart-Shield Armor Ring
 * and lower-right Multiplier Beat Pulse Ring (1x..8x).
 */
UCLASS()
class PULSETRIGGERVR_API UDiegeticCombatHudWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent, Category = "VRUI|Combat")
    void OnUpdateArmorShieldState(int32 CurrentHP, int32 MaxHP);

    UFUNCTION(BlueprintImplementableEvent, Category = "VRUI|Combat")
    void OnUpdateComboMultiplierRing(int32 Multiplier, float NormalizedBeatPhase);
};
