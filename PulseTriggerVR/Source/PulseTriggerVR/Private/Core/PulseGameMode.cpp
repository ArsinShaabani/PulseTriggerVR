#include "Core/PulseGameMode.h"
#include "Core/PulseGameInstance.h"
#include "Core/PulseGameState.h"
#include "Core/ObjectPoolSubsystem.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "Rhythm/RhythmDataAssets.h"
#include "Systems/ScoringSubsystem.h"
#include "Systems/PulseAudioSubsystem.h"
#include "Systems/SaveManagerSubsystem.h"
#include "Level/LevelDirectorActor.h"
#include "Level/SplineTrackActor.h"
#include "VR/VRPlayerPawn.h"
#include "Kismet/GameplayStatics.h"
#include "PulseTriggerVR.h"

APulseGameMode::APulseGameMode()
{
    PrimaryActorTick.bCanEverTick = false;
    DefaultPawnClass = AVRPlayerPawn::StaticClass();
    GameStateClass = APulseGameState::StaticClass();
}

void APulseGameMode::BeginPlay()
{
    Super::BeginPlay();

    CachedDirector = Cast<ALevelDirectorActor>(UGameplayStatics::GetActorOfClass(GetWorld(), ALevelDirectorActor::StaticClass()));
    CachedSplineTrack = Cast<ASplineTrackActor>(UGameplayStatics::GetActorOfClass(GetWorld(), ASplineTrackActor::StaticClass()));

    WarmupGameplayPools();

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        BeatMgr->OnSongCompleted.AddDynamic(this, &APulseGameMode::HandleSongFinished);
    }

    if (AVRPlayerPawn* PlayerPawn = Cast<AVRPlayerPawn>(UGameplayStatics::GetPlayerPawn(GetWorld(), 0)))
    {
        PlayerPawn->OnPlayerDefeated.AddDynamic(this, &APulseGameMode::HandlePlayerDefeated);
    }

    // Auto-start if a track was selected from the Main Menu
    if (UPulseGameInstance* GI = GetGameInstance<UPulseGameInstance>())
    {
        if (GI->GetSelectedTrack() != nullptr)
        {
            StartLevelRun(GI->GetSelectedTrack());
        }
        else if (DefaultLevelTrack != nullptr && GetWorld()->GetMapName().Contains(TEXT("Level")))
        {
            StartLevelRun(DefaultLevelTrack);
        }
    }
}

void APulseGameMode::WarmupGameplayPools()
{
    UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>();
    if (!PoolSys)
    {
        return;
    }

    if (BulletTracerPoolClass)
    {
        PoolSys->WarmupPool(BulletTracerPoolClass, 32, 64);
    }
    if (EnemyProjectilePoolClass)
    {
        PoolSys->WarmupPool(EnemyProjectilePoolClass, 48, 96);
    }
    for (const TPair<EEnemyArchetype, TSubclassOf<AActor>>& Pair : EnemyPoolClasses)
    {
        if (Pair.Value)
        {
            const int32 WarmCount = (Pair.Key == EEnemyArchetype::BossUnit) ? 1 : 12;
            PoolSys->WarmupPool(Pair.Value, WarmCount, 24);
        }
    }
}

void APulseGameMode::StartLevelRun(URhythmTrackDataAsset* OverrideTrack)
{
    UPulseGameInstance* GI = GetGameInstance<UPulseGameInstance>();
    URhythmTrackDataAsset* ActiveTrack = OverrideTrack ? OverrideTrack : (GI ? GI->GetSelectedTrack() : DefaultLevelTrack.Get());
    if (!ActiveTrack)
    {
        UE_LOG(LogPulseCore, Error, TEXT("StartLevelRun failed: No URhythmTrackDataAsset assigned."));
        return;
    }

    if (UScoringSubsystem* Scoring = GetWorld()->GetSubsystem<UScoringSubsystem>())
    {
        Scoring->ResetRunMetrics();
    }

    if (CachedDirector)
    {
        CachedDirector->InitializeTimeline(ActiveTrack->LevelTimeline, CachedSplineTrack);
    }

    if (AVRPlayerPawn* PlayerPawn = Cast<AVRPlayerPawn>(UGameplayStatics::GetPlayerPawn(GetWorld(), 0)))
    {
        PlayerPawn->ResetForNewRun(CachedSplineTrack);
    }

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        BeatMgr->StartTrack(ActiveTrack);
    }

    SetMatchState(EPulseMatchState::Playing);
}

void APulseGameMode::PauseRun()
{
    if (CurrentMatchState != EPulseMatchState::Playing)
    {
        return;
    }

    UGameplayStatics::SetGamePaused(GetWorld(), true);
    if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
    {
        Audio->SetMusicPaused(true);
    }
    SetMatchState(EPulseMatchState::Paused);
}

void APulseGameMode::ResumeRun()
{
    if (CurrentMatchState != EPulseMatchState::Paused)
    {
        return;
    }

    UGameplayStatics::SetGamePaused(GetWorld(), false);
    if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
    {
        Audio->SetMusicPaused(false);
    }
    SetMatchState(EPulseMatchState::Playing);
}

void APulseGameMode::CompleteLevelRun(bool bPlayerSurvived)
{
    if (CurrentMatchState == EPulseMatchState::Results)
    {
        return;
    }

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        BeatMgr->StopTrack();
    }

    UScoringSubsystem* Scoring = GetWorld()->GetSubsystem<UScoringSubsystem>();
    USaveManagerSubsystem* SaveMgr = GetGameInstance()->GetSubsystem<USaveManagerSubsystem>();
    UPulseGameInstance* GI = GetGameInstance<UPulseGameInstance>();

    if (Scoring && SaveMgr && GI && GI->GetSelectedTrack())
    {
        const FScoreBreakdown Breakdown = Scoring->FinalizeScoreBreakdown();
        if (bPlayerSurvived)
        {
            SaveMgr->RecordLevelResult(GI->GetSelectedTrack()->TrackId, GI->GetSelectedDifficulty(), Breakdown);
        }
    }

    SetMatchState(EPulseMatchState::Results);
}

void APulseGameMode::RestartLevelRun()
{
    UGameplayStatics::SetGamePaused(GetWorld(), false);
    for (const TPair<EEnemyArchetype, TSubclassOf<AActor>>& Pair : EnemyPoolClasses)
    {
        if (Pair.Value)
        {
            if (UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>())
            {
                PoolSys->ReturnAllOfClass(Pair.Value);
            }
        }
    }
    StartLevelRun();
}

void APulseGameMode::HandleSongFinished()
{
    CompleteLevelRun(true);
}

void APulseGameMode::HandlePlayerDefeated()
{
    CompleteLevelRun(false);
}

void APulseGameMode::SetMatchState(EPulseMatchState NewState)
{
    CurrentMatchState = NewState;
    if (APulseGameState* GS = GetGameState<APulseGameState>())
    {
        GS->SetPulseMatchState(NewState);
    }
    OnMatchStateChanged.Broadcast(NewState);
}
