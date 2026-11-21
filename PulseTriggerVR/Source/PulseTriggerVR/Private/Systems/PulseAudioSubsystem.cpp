#include "Systems/PulseAudioSubsystem.h"
#include "Rhythm/RhythmDataAssets.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "Components/AudioComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Sound/SoundBase.h"
#include "Sound/SoundWave.h"
#include "Engine/World.h"
#include "PulseTriggerVR.h"

void UPulseAudioSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
}

void UPulseAudioSubsystem::PlayTrackMusic(URhythmTrackDataAsset* TrackAsset)
{
    StopTrackMusic();

    UWorld* World = GetWorld();
    if (!World || !TrackAsset || !TrackAsset->PrimaryMusicStem)
    {
        return;
    }

    CurrentTrack = TrackAsset;
    PrimaryMusicComponent = UGameplayStatics::SpawnSound2D(World, TrackAsset->PrimaryMusicStem, CachedMasterVol * CachedMusicVol, 1.0f, 0.0f, nullptr, false, false);
    if (PrimaryMusicComponent)
    {
        PrimaryMusicComponent->OnAudioPlaybackPercent.AddDynamic(this, &UPulseAudioSubsystem::HandleAudioPlaybackPercent);
        PrimaryMusicComponent->Play(0.0f);
    }

    if (TrackAsset->PercussionAccentStem)
    {
        AdaptiveStemComponent = UGameplayStatics::SpawnSound2D(World, TrackAsset->PercussionAccentStem, 0.01f, 1.0f, 0.0f, nullptr, false, false);
        if (AdaptiveStemComponent)
        {
            AdaptiveStemComponent->Play(0.0f);
        }
    }
}

void UPulseAudioSubsystem::StopTrackMusic()
{
    if (PrimaryMusicComponent)
    {
        PrimaryMusicComponent->Stop();
        PrimaryMusicComponent = nullptr;
    }
    if (AdaptiveStemComponent)
    {
        AdaptiveStemComponent->Stop();
        AdaptiveStemComponent = nullptr;
    }
    CurrentTrack = nullptr;
}

void UPulseAudioSubsystem::SetMusicPaused(bool bPaused)
{
    if (PrimaryMusicComponent)
    {
        PrimaryMusicComponent->SetPaused(bPaused);
    }
    if (AdaptiveStemComponent)
    {
        AdaptiveStemComponent->SetPaused(bPaused);
    }
}

void UPulseAudioSubsystem::SetAdaptiveIntensity(float NormalizedComboIntensity)
{
    if (AdaptiveStemComponent)
    {
        const float TargetVol = FMath::Lerp(0.05f, CachedMasterVol * CachedMusicVol, FMath::Clamp(NormalizedComboIntensity, 0.0f, 1.0f));
        AdaptiveStemComponent->SetVolumeMultiplier(TargetVol);
    }
}

void UPulseAudioSubsystem::PlaySpatialSFX(USoundBase* SoundCue, const FVector& WorldLocation, float VolumeMultiplier)
{
    if (!SoundCue || !GetWorld())
    {
        return;
    }
    UGameplayStatics::PlaySoundAtLocation(
        GetWorld(),
        SoundCue,
        WorldLocation,
        VolumeMultiplier * CachedMasterVol * CachedSfxVol,
        1.0f,
        0.0f,
        DefaultVRSpatialAttenuation);
}

void UPulseAudioSubsystem::PlayMenuUISound(USoundBase* UISound)
{
    if (!UISound || !GetWorld())
    {
        return;
    }
    UGameplayStatics::PlaySound2D(GetWorld(), UISound, CachedMasterVol * CachedSfxVol);
}

void UPulseAudioSubsystem::ApplyAudioVolumes(float MasterVol, float MusicVol, float SfxVol)
{
    CachedMasterVol = FMath::Clamp(MasterVol, 0.0f, 1.5f);
    CachedMusicVol = FMath::Clamp(MusicVol, 0.0f, 1.5f);
    CachedSfxVol = FMath::Clamp(SfxVol, 0.0f, 1.5f);

    if (PrimaryMusicComponent)
    {
        PrimaryMusicComponent->SetVolumeMultiplier(CachedMasterVol * CachedMusicVol);
    }
}

void UPulseAudioSubsystem::HandleAudioPlaybackPercent(const USoundWave* PlayingSoundWave, const float PlaybackPercent)
{
    if (!CurrentTrack || !GetWorld())
    {
        return;
    }

    const double TrackDuration = PlayingSoundWave ? static_cast<double>(PlayingSoundWave->Duration) : static_cast<double>(CurrentTrack->TrackDurationSeconds);
    const double AudioSeconds = static_cast<double>(PlaybackPercent) * TrackDuration;

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        BeatMgr->NotifyAudioPlaybackTime(AudioSeconds);
    }
}
