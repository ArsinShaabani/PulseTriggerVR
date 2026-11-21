#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Core/PulseTypes.h"
#include "RhythmDataAssets.generated.h"

class USoundBase;
class UEnemyArchetypeDataAsset;

UENUM(BlueprintType)
enum class ETimelineEventType : uint8
{
    SpawnEnemyWave      UMETA(DisplayName = "Spawn Enemy Wave"),
    SpawnObstacle       UMETA(DisplayName = "Spawn Dodge Obstacle"),
    EnvironmentTrigger  UMETA(DisplayName = "Environment Trigger"),
    CinematicMoment     UMETA(DisplayName = "Cinematic Slow-Mo / Lighting"),
    SpeedChange         UMETA(DisplayName = "Track Speed Curve Change")
};

USTRUCT(BlueprintType)
struct FEnemyWaveSpawnEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Wave")
    TObjectPtr<UEnemyArchetypeDataAsset> EnemyArchetype = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Wave")
    FVector SplineRelativeOffset = FVector(1800.0f, 350.0f, 0.0f);

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Wave")
    int32 FireOnBeatOffset = 2;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Wave")
    EMusicDifficulty MinimumDifficulty = EMusicDifficulty::Easy;
};

USTRUCT(BlueprintType)
struct FTimelineBeatEvent
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Timeline")
    int32 TriggerMeasure = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Timeline")
    int32 TriggerSixteenthInMeasure = 0;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Timeline")
    ETimelineEventType EventType = ETimelineEventType::SpawnEnemyWave;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Timeline")
    TArray<FEnemyWaveSpawnEntry> EnemyWave;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Timeline")
    FName EventTag = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Timeline")
    float NumericParameter = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Timeline")
    FVector RelativeLocation = FVector::ZeroVector;

    int32 GetAbsoluteSixteenth(int32 BeatsPerMeasure = 4) const
    {
        return (TriggerMeasure * BeatsPerMeasure * 4) + TriggerSixteenthInMeasure;
    }
};

/**
 * Designer-authored timeline driving procedural waves, obstacles, and cinematic cues.
 */
UCLASS(BlueprintType)
class PULSETRIGGERVR_API ULevelTimelineDataAsset : public UDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Level")
    FName LevelMapName = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Level")
    float BaseMovementSpeedCmPerSec = 650.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Level")
    TArray<FTimelineBeatEvent> BeatEvents;
};

/**
 * Master track definition binding audio stems, BPM, beat windows, and level timeline.
 */
UCLASS(BlueprintType)
class PULSETRIGGERVR_API URhythmTrackDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    FName TrackId = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    FText DisplayTitle;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    FText ArtistName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    TObjectPtr<USoundBase> PrimaryMusicStem = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    TObjectPtr<USoundBase> PercussionAccentStem = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track", meta = (ClampMin = "60.0", ClampMax = "240.0"))
    float BPM = 128.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track", meta = (ClampMin = "2", ClampMax = "12"))
    int32 BeatsPerMeasure = 4;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    float TrackDurationSeconds = 180.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    float FirstBeatOffsetSeconds = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "TimingWindow")
    float PerfectWindowMs = 45.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "TimingWindow")
    float GreatWindowMs = 95.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "TimingWindow")
    float GoodWindowMs = 145.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Track")
    TObjectPtr<ULevelTimelineDataAsset> LevelTimeline = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "UI")
    TObjectPtr<UTexture2D> CoverArtwork = nullptr;
};
