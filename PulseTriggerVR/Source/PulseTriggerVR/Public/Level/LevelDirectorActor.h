#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/PulseTypes.h"
#include "Rhythm/RhythmDataAssets.h"
#include "LevelDirectorActor.generated.h"

class ASplineTrackActor;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEnvironmentCueTriggered, FName, EventTag, float, Parameter);

/**
 * Command-pattern timeline director reading ULevelTimelineDataAsset
 * and dispatching beat-locked enemy waves, obstacles, cinematic moments, and speed changes.
 */
UCLASS()
class PULSETRIGGERVR_API ALevelDirectorActor : public AActor
{
    GENERATED_BODY()

public:
    ALevelDirectorActor();

    virtual void BeginPlay() override;

    UFUNCTION(BlueprintCallable, Category = "LevelDirector")
    void InitializeTimeline(ULevelTimelineDataAsset* InTimeline, ASplineTrackActor* InSplineTrack);

    UPROPERTY(BlueprintAssignable, Category = "LevelDirector")
    FOnEnvironmentCueTriggered OnEnvironmentCue;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Obstacles")
    TSubclassOf<AActor> ObstaclePoolClass;

private:
    UFUNCTION()
    void HandleSixteenthBeat(const FBeatEventPayload& Payload);

    void ExecuteTimelineCommand(const FTimelineBeatEvent& Event);
    void SpawnWaveCommand(const FTimelineBeatEvent& Event);

    UPROPERTY(Transient)
    TObjectPtr<ULevelTimelineDataAsset> ActiveTimeline = nullptr;

    UPROPERTY(Transient)
    TObjectPtr<ASplineTrackActor> ActiveSpline = nullptr;

    TArray<FTimelineBeatEvent> SortedEvents;
    int32 NextEventCursor = 0;
};
