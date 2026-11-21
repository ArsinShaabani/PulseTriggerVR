#include "Rhythm/BeatManagerSubsystem.h"
#include "Rhythm/RhythmDataAssets.h"
#include "Systems/PulseAudioSubsystem.h"
#include "Systems/SaveManagerSubsystem.h"
#include "Engine/GameInstance.h"
#include "PulseTriggerVR.h"

TStatId UBeatManagerSubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UBeatManagerSubsystem, STATGROUP_Tickables);
}

void UBeatManagerSubsystem::StartTrack(URhythmTrackDataAsset* TrackAsset)
{
    if (!TrackAsset)
    {
        UE_LOG(LogPulseRhythm, Error, TEXT("UBeatManagerSubsystem::StartTrack received null TrackAsset"));
        return;
    }

    ActiveTrack = TrackAsset;
    const double SafeBPM = FMath::Max(30.0f, TrackAsset->BPM);
    SecondsPerQuarter = 60.0 / SafeBPM;
    SecondsPerSixteenth = SecondsPerQuarter * 0.25;

    if (UGameInstance* GI = GetWorld()->GetGameInstance())
    {
        if (USaveManagerSubsystem* SaveMgr = GI->GetSubsystem<USaveManagerSubsystem>())
        {
            AudioLatencyOffsetSec = SaveMgr->GetCurrentSettings().AudioLatencyOffsetMs * 0.001f;
        }
        if (UPulseAudioSubsystem* AudioSys = GI->GetSubsystem<UPulseAudioSubsystem>())
        {
            AudioSys->PlayTrackMusic(TrackAsset);
        }
    }

    RawSongTime = 0.0;
    CompensatedSongTime = -TrackAsset->FirstBeatOffsetSeconds - AudioLatencyOffsetSec;
    LastTriggeredSixteenth = -1;
    CurrentBeatPhase = 0.0f;
    bIsTrackActive = true;

    UE_LOG(LogPulseRhythm, Log, TEXT("Track Started: %s | BPM=%.1f | LatencyOffset=%.1fms"),
        *TrackAsset->TrackId.ToString(), TrackAsset->BPM, AudioLatencyOffsetSec * 1000.0f);
}

void UBeatManagerSubsystem::StopTrack()
{
    bIsTrackActive = false;
    if (UGameInstance* GI = GetWorld()->GetGameInstance())
    {
        if (UPulseAudioSubsystem* AudioSys = GI->GetSubsystem<UPulseAudioSubsystem>())
        {
            AudioSys->StopTrackMusic();
        }
    }
}

void UBeatManagerSubsystem::SetLatencyOffsetMs(float OffsetMs)
{
    AudioLatencyOffsetSec = FMath::Clamp(OffsetMs, -150.0f, 150.0f) * 0.001f;
}

void UBeatManagerSubsystem::NotifyAudioPlaybackTime(double AudioClockSeconds)
{
    if (!bIsTrackActive)
    {
        return;
    }

    // Smooth phase-locked loop (PLL) drift correction against DSP audio hardware clock
    const double Drift = AudioClockSeconds - RawSongTime;
    if (FMath::Abs(Drift) > 0.045)
    {
        RawSongTime = AudioClockSeconds;
    }
    else
    {
        RawSongTime += Drift * 0.25;
    }
}

void UBeatManagerSubsystem::Tick(float DeltaTime)
{
    if (!bIsTrackActive || !ActiveTrack)
    {
        return;
    }

    RawSongTime += static_cast<double>(DeltaTime);
    CompensatedSongTime = RawSongTime - static_cast<double>(ActiveTrack->FirstBeatOffsetSeconds) - static_cast<double>(AudioLatencyOffsetSec);

    if (CompensatedSongTime >= 0.0)
    {
        const double QuarterFloat = CompensatedSongTime / SecondsPerQuarter;
        CurrentBeatPhase = static_cast<float>(FMath::Frac(QuarterFloat));

        const int32 CurrentSixteenth = FMath::FloorToInt(CompensatedSongTime / SecondsPerSixteenth);
        while (LastTriggeredSixteenth < CurrentSixteenth)
        {
            ++LastTriggeredSixteenth;
            DispatchSubdivisionEvents(LastTriggeredSixteenth);
        }
    }

    if (RawSongTime >= static_cast<double>(ActiveTrack->TrackDurationSeconds))
    {
        bIsTrackActive = false;
        OnSongCompleted.Broadcast();
    }
}

void UBeatManagerSubsystem::DispatchSubdivisionEvents(int32 NewSixteenthIndex)
{
    const int32 BeatsPerMeasure = FMath::Max(1, ActiveTrack->BeatsPerMeasure);
    const int32 SixteenthsPerMeasure = BeatsPerMeasure * 4;

    FBeatEventPayload Payload;
    Payload.TotalSixteenthIndex = NewSixteenthIndex;
    Payload.MeasureIndex = NewSixteenthIndex / SixteenthsPerMeasure;
    const int32 RemSixteenth = NewSixteenthIndex % SixteenthsPerMeasure;
    Payload.BeatInMeasure = RemSixteenth / 4;
    Payload.SongTimeSeconds = CompensatedSongTime;
    Payload.BeatPhaseNormalized = CurrentBeatPhase;
    Payload.bIsDownbeat = (RemSixteenth == 0);

    Payload.Subdivision = EBeatSubdivision::Sixteenth;
    OnSixteenthBeat.Broadcast(Payload);

    if (NewSixteenthIndex % 2 == 0)
    {
        Payload.Subdivision = EBeatSubdivision::Eighth;
        OnEighthBeat.Broadcast(Payload);
    }

    if (NewSixteenthIndex % 4 == 0)
    {
        Payload.Subdivision = EBeatSubdivision::Quarter;
        OnQuarterBeat.Broadcast(Payload);
    }
}

EBeatAccuracyRank UBeatManagerSubsystem::EvaluateBeatAccuracy(float& OutAbsErrorMs) const
{
    if (!ActiveTrack || !bIsTrackActive)
    {
        OutAbsErrorMs = 0.0f;
        return EBeatAccuracyRank::Good;
    }

    const double NearestBeatFraction = FMath::Min(CurrentBeatPhase, 1.0f - CurrentBeatPhase);
    OutAbsErrorMs = static_cast<float>(NearestBeatFraction * SecondsPerQuarter * 1000.0);

    if (OutAbsErrorMs <= ActiveTrack->PerfectWindowMs)
    {
        return EBeatAccuracyRank::Perfect;
    }
    if (OutAbsErrorMs <= ActiveTrack->GreatWindowMs)
    {
        return EBeatAccuracyRank::Great;
    }
    if (OutAbsErrorMs <= ActiveTrack->GoodWindowMs)
    {
        return EBeatAccuracyRank::Good;
    }
    return EBeatAccuracyRank::OffBeat;
}

FBeatDebugSnapshot UBeatManagerSubsystem::GetDebugBeatSnapshot() const
{
    FBeatDebugSnapshot Snap;
    Snap.BPM = ActiveTrack ? ActiveTrack->BPM : 120.0f;
    Snap.SongTimeSeconds = CompensatedSongTime;
    Snap.BeatPhase = CurrentBeatPhase;
    Snap.SixteenthIndex = LastTriggeredSixteenth;
    const int32 BeatsPerMeasure = ActiveTrack ? FMath::Max(1, ActiveTrack->BeatsPerMeasure) : 4;
    if (LastTriggeredSixteenth >= 0)
    {
        Snap.Measure = LastTriggeredSixteenth / (BeatsPerMeasure * 4);
        Snap.Beat = (LastTriggeredSixteenth % (BeatsPerMeasure * 4)) / 4;
    }
    Snap.LatencyOffsetMs = AudioLatencyOffsetSec * 1000.0f;
    return Snap;
}
