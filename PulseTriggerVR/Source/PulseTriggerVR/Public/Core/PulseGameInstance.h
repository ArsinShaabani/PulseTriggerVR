#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "Core/PulseTypes.h"
#include "PulseGameInstance.generated.h"

class URhythmTrackDataAsset;

/**
 * Persistent game instance coordinating OpenXR performance tiering,
 * selected track/difficulty state across level loads, and subsystem initialization.
 */
UCLASS(Config = Game)
class PULSETRIGGERVR_API UPulseGameInstance : public UGameInstance
{
    GENERATED_BODY()

public:
    virtual void Init() override;

    UFUNCTION(BlueprintCallable, Category = "Session")
    void SelectLevelAndDifficulty(URhythmTrackDataAsset* TrackAsset, EMusicDifficulty Difficulty);

    UFUNCTION(BlueprintPure, Category = "Session")
    URhythmTrackDataAsset* GetSelectedTrack() const { return SelectedTrack; }

    UFUNCTION(BlueprintPure, Category = "Session")
    EMusicDifficulty GetSelectedDifficulty() const { return SelectedDifficulty; }

    UFUNCTION(BlueprintCallable, Category = "Performance")
    void ApplyQuestPerformanceProfile(const FPlayerVRSettings& Settings);

    UPROPERTY(Config, EditDefaultsOnly, BlueprintReadOnly, Category = "Performance")
    float TargetRefreshRateHz = 90.0f;

    UPROPERTY(Config, EditDefaultsOnly, BlueprintReadOnly, Category = "Performance")
    float DefaultAudioLatencyOffsetMs = 18.0f;

private:
    UPROPERTY(Transient)
    TObjectPtr<URhythmTrackDataAsset> SelectedTrack = nullptr;

    UPROPERTY(Transient)
    EMusicDifficulty SelectedDifficulty = EMusicDifficulty::Normal;
};
