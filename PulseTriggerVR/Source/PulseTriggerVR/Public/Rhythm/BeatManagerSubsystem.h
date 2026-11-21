#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "Core/PulseTypes.h"
#include "BeatManagerSubsystem.generated.h"

class URhythmTrackDataAsset;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBeatSubdivisionDelegate, const FBeatEventPayload&, Payload);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnSongCompletedDelegate);

USTRUCT(BlueprintType)
struct FBeatDebugSnapshot
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "RhythmDebug")
    float BPM = 120.0f;

    UPROPERTY(BlueprintReadOnly, Category = "RhythmDebug")
    double SongTimeSeconds = 0.0;

    UPROPERTY(BlueprintReadOnly, Category = "RhythmDebug")
    float BeatPhase = 0.0f;

    UPROPERTY(BlueprintReadOnly, Category = "RhythmDebug")
    int32 Measure = 0;

    UPROPERTY(BlueprintReadOnly, Category = "RhythmDebug")
    int32 Beat = 0;

    UPROPERTY(BlueprintReadOnly, Category = "RhythmDebug")
    int32 SixteenthIndex = 0;

    UPROPERTY(BlueprintReadOnly, Category = "RhythmDebug")
    float LatencyOffsetMs = 0.0f;
};

/**
 * Sample-accurate rhythm clock supporting 1/4, 1/8, 1/16 subdivisions,
 * DSP drift correction, and user-calibrated audio/visual latency compensation.
 */
UCLASS()
class PULSETRIGGERVR_API UBeatManagerSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;
    virtual bool IsTickableInEditor() const override { return false; }

    UFUNCTION(BlueprintCallable, Category = "Rhythm")
    void StartTrack(URhythmTrackDataAsset* TrackAsset);

    UFUNCTION(BlueprintCallable, Category = "Rhythm")
    void StopTrack();

    UFUNCTION(BlueprintCallable, Category = "Rhythm")
    void SetLatencyOffsetMs(float OffsetMs);

    UFUNCTION(BlueprintCallable, Category = "Rhythm")
    void NotifyAudioPlaybackTime(double AudioClockSeconds);

    UFUNCTION(BlueprintPure, Category = "Rhythm")
    EBeatAccuracyRank EvaluateBeatAccuracy(float& OutAbsErrorMs) const;

    UFUNCTION(BlueprintPure, Category = "Rhythm")
    float GetBeatPhaseNormalized() const { return CurrentBeatPhase; }

    UFUNCTION(BlueprintPure, Category = "Rhythm")
    double GetCompensatedSongTime() const { return CompensatedSongTime; }

    UFUNCTION(BlueprintPure, Category = "Rhythm")
    int32 GetCurrentSixteenthIndex() const { return LastTriggeredSixteenth; }

    UFUNCTION(BlueprintPure, Category = "Rhythm")
    FBeatDebugSnapshot GetDebugBeatSnapshot() const;

    UFUNCTION(BlueprintPure, Category = "Rhythm")
    bool IsPlaying() const { return bIsTrackActive; }

    UPROPERTY(BlueprintAssignable, Category = "Rhythm")
    FOnBeatSubdivisionDelegate OnQuarterBeat;

    UPROPERTY(BlueprintAssignable, Category = "Rhythm")
    FOnBeatSubdivisionDelegate OnEighthBeat;

    UPROPERTY(BlueprintAssignable, Category = "Rhythm")
    FOnBeatSubdivisionDelegate OnSixteenthBeat;

    UPROPERTY(BlueprintAssignable, Category = "Rhythm")
    FOnSongCompletedDelegate OnSongCompleted;

private:
    void DispatchSubdivisionEvents(int32 NewSixteenthIndex);

    UPROPERTY(Transient)
    TObjectPtr<URhythmTrackDataAsset> ActiveTrack = nullptr;

    bool bIsTrackActive = false;
    double RawSongTime = 0.0;
    double CompensatedSongTime = 0.0;
    double SecondsPerQuarter = 0.5;
    double SecondsPerSixteenth = 0.125;
    float AudioLatencyOffsetSec = 0.018f;
    float CurrentBeatPhase = 0.0f;
    int32 LastTriggeredSixteenth = -1;
};
