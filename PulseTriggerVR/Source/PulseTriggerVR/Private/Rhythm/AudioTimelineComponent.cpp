#include "Rhythm/AudioTimelineComponent.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "Engine/World.h"

UAudioTimelineComponent::UAudioTimelineComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UAudioTimelineComponent::BeginPlay()
{
    Super::BeginPlay();

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        switch (ListenSubdivision)
        {
        case EBeatSubdivision::Quarter:
            BeatMgr->OnQuarterBeat.AddDynamic(this, &UAudioTimelineComponent::HandleBeatEvent);
            break;
        case EBeatSubdivision::Eighth:
            BeatMgr->OnEighthBeat.AddDynamic(this, &UAudioTimelineComponent::HandleBeatEvent);
            break;
        case EBeatSubdivision::Sixteenth:
            BeatMgr->OnSixteenthBeat.AddDynamic(this, &UAudioTimelineComponent::HandleBeatEvent);
            break;
        }
    }
}

void UAudioTimelineComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (UWorld* World = GetWorld())
    {
        if (UBeatManagerSubsystem* BeatMgr = World->GetSubsystem<UBeatManagerSubsystem>())
        {
            BeatMgr->OnQuarterBeat.RemoveDynamic(this, &UAudioTimelineComponent::HandleBeatEvent);
            BeatMgr->OnEighthBeat.RemoveDynamic(this, &UAudioTimelineComponent::HandleBeatEvent);
            BeatMgr->OnSixteenthBeat.RemoveDynamic(this, &UAudioTimelineComponent::HandleBeatEvent);
        }
    }
    Super::EndPlay(EndPlayReason);
}

void UAudioTimelineComponent::HandleBeatEvent(const FBeatEventPayload& Payload)
{
    OnBeatFired.Broadcast(Payload);
}
