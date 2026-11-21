#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "PulseAudioSubsystem.generated.h"

class UAudioComponent;
class USoundBase;
class USoundAttenuation;
class USoundMix;
class URhythmTrackDataAsset;

/**
 * Manages streaming OGG/WAV track playback, DSP playback position feedback
 * to UBeatManagerSubsystem, adaptive percussion stems, spatial SFX, and UI cues.
 */
UCLASS()
class PULSETRIGGERVR_API UPulseAudioSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintCallable, Category = "Audio|Music")
    void PlayTrackMusic(URhythmTrackDataAsset* TrackAsset);

    UFUNCTION(BlueprintCallable, Category = "Audio|Music")
    void StopTrackMusic();

    UFUNCTION(BlueprintCallable, Category = "Audio|Music")
    void SetMusicPaused(bool bPaused);

    UFUNCTION(BlueprintCallable, Category = "Audio|Adaptive")
    void SetAdaptiveIntensity(float NormalizedComboIntensity);

    UFUNCTION(BlueprintCallable, Category = "Audio|SFX")
    void PlaySpatialSFX(USoundBase* SoundCue, const FVector& WorldLocation, float VolumeMultiplier = 1.0f);

    UFUNCTION(BlueprintCallable, Category = "Audio|UI")
    void PlayMenuUISound(USoundBase* UISound);

    UFUNCTION(BlueprintCallable, Category = "Audio|Settings")
    void ApplyAudioVolumes(float MasterVol, float MusicVol, float SfxVol);

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Audio")
    TObjectPtr<USoundAttenuation> DefaultVRSpatialAttenuation = nullptr;

private:
    UFUNCTION()
    void HandleAudioPlaybackPercent(const USoundWave* PlayingSoundWave, const float PlaybackPercent);

    UPROPERTY(Transient)
    TObjectPtr<UAudioComponent> PrimaryMusicComponent = nullptr;

    UPROPERTY(Transient)
    TObjectPtr<UAudioComponent> AdaptiveStemComponent = nullptr;

    UPROPERTY(Transient)
    TObjectPtr<URhythmTrackDataAsset> CurrentTrack = nullptr;

    float CachedMasterVol = 1.0f;
    float CachedMusicVol = 0.9f;
    float CachedSfxVol = 0.9f;
};
