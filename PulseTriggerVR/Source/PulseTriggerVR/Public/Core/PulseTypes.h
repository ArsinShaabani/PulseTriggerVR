#pragma once

#include "CoreMinimal.h"
#include "PulseTypes.generated.h"

UENUM(BlueprintType)
enum class EBeatSubdivision : uint8
{
    Quarter     UMETA(DisplayName = "1/4 Note"),
    Eighth      UMETA(DisplayName = "1/8 Note"),
    Sixteenth   UMETA(DisplayName = "1/16 Note")
};

UENUM(BlueprintType)
enum class EBeatAccuracyRank : uint8
{
    OffBeat     UMETA(DisplayName = "Off-Beat"),
    Good        UMETA(DisplayName = "Good"),
    Great       UMETA(DisplayName = "Great"),
    Perfect     UMETA(DisplayName = "Perfect")
};

UENUM(BlueprintType)
enum class EPerformanceGrade : uint8
{
    D           UMETA(DisplayName = "D"),
    C           UMETA(DisplayName = "C"),
    B           UMETA(DisplayName = "B"),
    A           UMETA(DisplayName = "A"),
    S           UMETA(DisplayName = "S"),
    SPlus       UMETA(DisplayName = "S+")
};

UENUM(BlueprintType)
enum class EEnemyArchetype : uint8
{
    NormalShooter   UMETA(DisplayName = "Normal Shooter"),
    HeavyUnit       UMETA(DisplayName = "Heavy Armored Unit"),
    MeleeCharger    UMETA(DisplayName = "Melee Charger"),
    EliteUnit       UMETA(DisplayName = "Elite Tactical"),
    BossUnit        UMETA(DisplayName = "Boss Unit")
};

UENUM(BlueprintType)
enum class EEnemyState : uint8
{
    Pooled          UMETA(DisplayName = "Pooled"),
    Spawning        UMETA(DisplayName = "Spawning"),
    Repositioning   UMETA(DisplayName = "Repositioning"),
    Telegraphing    UMETA(DisplayName = "Telegraphing"),
    Attacking       UMETA(DisplayName = "Attacking"),
    Staggered       UMETA(DisplayName = "Staggered"),
    Dead            UMETA(DisplayName = "Dead")
};

UENUM(BlueprintType)
enum class EVRPlayMode : uint8
{
    Standing    UMETA(DisplayName = "Standing"),
    Seated      UMETA(DisplayName = "Seated")
};

UENUM(BlueprintType)
enum class EVRHandedness : uint8
{
    Right       UMETA(DisplayName = "Right Dominant"),
    Left        UMETA(DisplayName = "Left Dominant"),
    DualWield   UMETA(DisplayName = "Dual Wield")
};

UENUM(BlueprintType)
enum class EMusicDifficulty : uint8
{
    Easy        UMETA(DisplayName = "Easy"),
    Normal      UMETA(DisplayName = "Normal"),
    Hard        UMETA(DisplayName = "Hard")
};

UENUM(BlueprintType)
enum class EPulseMatchState : uint8
{
    MainMenu    UMETA(DisplayName = "Main Menu"),
    Countdown   UMETA(DisplayName = "Countdown"),
    Playing     UMETA(DisplayName = "Playing"),
    Paused      UMETA(DisplayName = "Paused"),
    Results     UMETA(DisplayName = "Results")
};

USTRUCT(BlueprintType)
struct FBeatEventPayload
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Rhythm")
    int32 MeasureIndex = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Rhythm")
    int32 BeatInMeasure = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Rhythm")
    int32 TotalSixteenthIndex = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Rhythm")
    EBeatSubdivision Subdivision = EBeatSubdivision::Quarter;

    UPROPERTY(BlueprintReadOnly, Category = "Rhythm")
    double SongTimeSeconds = 0.0;

    UPROPERTY(BlueprintReadOnly, Category = "Rhythm")
    float BeatPhaseNormalized = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Rhythm")
    bool bIsDownbeat = false;
};

USTRUCT(BlueprintType)
struct FShotResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    bool bHit = false;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    bool bHeadshot = false;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    bool bKill = false;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    bool bArmorBroken = false;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    EBeatAccuracyRank BeatRank = EBeatAccuracyRank::OffBeat;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    float BeatErrorMs = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    int32 PointsAwarded = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Combat")
    FVector ImpactLocation = FVector::ZeroVector;
};

USTRUCT(BlueprintType)
struct FScoreBreakdown
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int64 TotalScore = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 CurrentCombo = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 MaxCombo = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 ComboMultiplier = 1;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 ShotsFired = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 ShotsHit = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 OnBeatHits = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 Headshots = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 PerfectDodges = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    int32 DamageTaken = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    float AccuracyPercent = 100.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    float OnBeatPercent = 100.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Scoring")
    EPerformanceGrade FinalGrade = EPerformanceGrade::SPlus;
};

USTRUCT(BlueprintType)
struct FPlayerVRSettings
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "VR")
    EVRPlayMode PlayMode = EVRPlayMode::Standing;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "VR")
    EVRHandedness Handedness = EVRHandedness::Right;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "VR")
    float CalibratedEyeHeightCm = 170.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "VR")
    float ComfortVignetteIntensity = 0.45f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "VR")
    bool bAutoReloadEnabled = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "VR")
    bool bGuardianWarningEnabled = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    float AudioLatencyOffsetMs = 18.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    float MasterVolume = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    float MusicVolume = 0.9f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    float SfxVolume = 0.9f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance")
    int32 FoveationLevel = 2; // 0=Off, 1=Low, 2=Med, 3=High, 4=HighTop

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance")
    float RenderScalePercent = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Performance")
    bool bDynamicResolution = true;
};

USTRUCT(BlueprintType)
struct FLevelScoreRecord
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save")
    FName LevelId = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save")
    EMusicDifficulty Difficulty = EMusicDifficulty::Normal;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save")
    int64 BestScore = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save")
    int32 BestCombo = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save")
    float BestAccuracy = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save")
    EPerformanceGrade BestGrade = EPerformanceGrade::D;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save")
    bool bCleared = false;
};
