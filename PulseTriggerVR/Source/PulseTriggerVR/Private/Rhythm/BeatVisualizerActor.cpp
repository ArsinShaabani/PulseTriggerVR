#include "Rhythm/BeatVisualizerActor.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "Materials/MaterialParameterCollection.h"
#include "Materials/MaterialParameterCollectionInstance.h"
#include "Engine/World.h"

ABeatVisualizerActor::ABeatVisualizerActor()
{
    PrimaryActorTick.bCanEverTick = true;
}

void ABeatVisualizerActor::BeginPlay()
{
    Super::BeginPlay();

    if (BeatParameterCollection && GetWorld())
    {
        MPCInstance = GetWorld()->GetParameterCollectionInstance(BeatParameterCollection);
    }

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        BeatMgr->OnQuarterBeat.AddDynamic(this, &ABeatVisualizerActor::OnQuarterBeat);
    }
}

void ABeatVisualizerActor::OnQuarterBeat(const FBeatEventPayload& Payload)
{
    CurrentPulseIntensity = Payload.bIsDownbeat ? 1.0f : 0.72f;
}

void ABeatVisualizerActor::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    CurrentPulseIntensity = FMath::FInterpTo(CurrentPulseIntensity, 0.0f, DeltaTime, DecaySpeed);

    if (MPCInstance)
    {
        MPCInstance->SetScalarParameterValue(BeatIntensityParamName, CurrentPulseIntensity);
        if (const UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
        {
            MPCInstance->SetScalarParameterValue(BeatPhaseParamName, BeatMgr->GetBeatPhaseNormalized());
        }
    }
}
