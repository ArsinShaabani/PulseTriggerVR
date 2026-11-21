#include "Level/LevelDirectorActor.h"
#include "Level/SplineTrackActor.h"
#include "Level/TrackProgressionComponent.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "AI/EnemyFactorySubsystem.h"
#include "Core/ObjectPoolSubsystem.h"
#include "Core/PulseGameInstance.h"
#include "Kismet/GameplayStatics.h"
#include "PulseTriggerVR.h"

ALevelDirectorActor::ALevelDirectorActor()
{
    PrimaryActorTick.bCanEverTick = false;
}

void ALevelDirectorActor::BeginPlay()
{
    Super::BeginPlay();

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        BeatMgr->OnSixteenthBeat.AddDynamic(this, &ALevelDirectorActor::HandleSixteenthBeat);
    }
}

void ALevelDirectorActor::InitializeTimeline(ULevelTimelineDataAsset* InTimeline, ASplineTrackActor* InSplineTrack)
{
    ActiveTimeline = InTimeline;
    ActiveSpline = InSplineTrack;
    SortedEvents.Empty();
    NextEventCursor = 0;

    if (!ActiveTimeline)
    {
        return;
    }

    SortedEvents = ActiveTimeline->BeatEvents;
    SortedEvents.Sort([](const FTimelineBeatEvent& A, const FTimelineBeatEvent& B)
    {
        return A.GetAbsoluteSixteenth() < B.GetAbsoluteSixteenth();
    });
}

void ALevelDirectorActor::HandleSixteenthBeat(const FBeatEventPayload& Payload)
{
    while (NextEventCursor < SortedEvents.Num())
    {
        const FTimelineBeatEvent& NextEvt = SortedEvents[NextEventCursor];
        if (NextEvt.GetAbsoluteSixteenth() <= Payload.TotalSixteenthIndex)
        {
            ExecuteTimelineCommand(NextEvt);
            ++NextEventCursor;
        }
        else
        {
            break;
        }
    }
}

void ALevelDirectorActor::ExecuteTimelineCommand(const FTimelineBeatEvent& Event)
{
    switch (Event.EventType)
    {
    case ETimelineEventType::SpawnEnemyWave:
        SpawnWaveCommand(Event);
        break;

    case ETimelineEventType::SpawnObstacle:
        if (ObstaclePoolClass)
        {
            if (UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>())
            {
                if (APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(GetWorld(), 0))
                {
                    const FTransform SpawnXform = FTransform(
                        PlayerPawn->GetActorRotation(),
                        PlayerPawn->GetActorTransform().TransformPosition(Event.RelativeLocation));
                    PoolSys->AcquireActor(ObstaclePoolClass, SpawnXform);
                }
            }
        }
        break;

    case ETimelineEventType::EnvironmentTrigger:
        OnEnvironmentCue.Broadcast(Event.EventTag, Event.NumericParameter);
        break;

    case ETimelineEventType::CinematicMoment:
        UGameplayStatics::SetGlobalTimeDilation(GetWorld(), FMath::Clamp(Event.NumericParameter, 0.35f, 1.0f));
        OnEnvironmentCue.Broadcast(Event.EventTag, Event.NumericParameter);
        break;

    case ETimelineEventType::SpeedChange:
        if (APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(GetWorld(), 0))
        {
            if (UTrackProgressionComponent* Prog = PlayerPawn->FindComponentByClass<UTrackProgressionComponent>())
            {
                Prog->SetTargetSpeedCmPerSec(Event.NumericParameter);
            }
        }
        break;
    }
}

void ALevelDirectorActor::SpawnWaveCommand(const FTimelineBeatEvent& Event)
{
    UEnemyFactorySubsystem* Factory = GetWorld()->GetSubsystem<UEnemyFactorySubsystem>();
    APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(GetWorld(), 0);
    if (!Factory || !PlayerPawn)
    {
        return;
    }

    EMusicDifficulty CurrentDiff = EMusicDifficulty::Normal;
    if (UPulseGameInstance* GI = GetGameInstance<UPulseGameInstance>())
    {
        CurrentDiff = GI->GetSelectedDifficulty();
    }

    const FTransform PlayerXform = PlayerPawn->GetActorTransform();
    for (const FEnemyWaveSpawnEntry& Entry : Event.EnemyWave)
    {
        if (!Entry.EnemyArchetype || static_cast<uint8>(CurrentDiff) < static_cast<uint8>(Entry.MinimumDifficulty))
        {
            continue;
        }

        const FVector WorldPos = PlayerXform.TransformPosition(Entry.SplineRelativeOffset);
        const FRotator FacingRot = (PlayerPawn->GetActorLocation() - WorldPos).Rotation();
        Factory->SpawnEnemyFromArchetype(Entry.EnemyArchetype, FTransform(FacingRot, WorldPos), Entry.FireOnBeatOffset);
    }
}
