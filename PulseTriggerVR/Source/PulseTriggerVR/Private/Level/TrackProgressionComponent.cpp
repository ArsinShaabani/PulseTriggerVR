#include "Level/TrackProgressionComponent.h"
#include "Level/SplineTrackActor.h"
#include "GameFramework/Actor.h"

UTrackProgressionComponent::UTrackProgressionComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UTrackProgressionComponent::BindSplineTrack(ASplineTrackActor* InSplineTrack)
{
    SplineTrack = InSplineTrack;
    CurrentDistanceCm = 0.0f;
    CurrentSpeedCmPerSec = 0.0f;
    TargetSpeedCmPerSec = BaseSpeedCmPerSec;
    if (SplineTrack && GetOwner())
    {
        GetOwner()->SetActorTransform(SplineTrack->GetTransformAtDistance(0.0f));
    }
}

void UTrackProgressionComponent::StartProgression()
{
    bIsMoving = true;
    TargetSpeedCmPerSec = BaseSpeedCmPerSec;
}

void UTrackProgressionComponent::StopProgression()
{
    bIsMoving = false;
    TargetSpeedCmPerSec = 0.0f;
}

void UTrackProgressionComponent::SetTargetSpeedCmPerSec(float NewSpeedCmPerSec)
{
    TargetSpeedCmPerSec = FMath::Clamp(NewSpeedCmPerSec, 0.0f, 1600.0f);
}

float UTrackProgressionComponent::GetNormalizedSpeedRatio() const
{
    return (BaseSpeedCmPerSec > 1.0f) ? (CurrentSpeedCmPerSec / BaseSpeedCmPerSec) : 0.0f;
}

void UTrackProgressionComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (!SplineTrack || !GetOwner())
    {
        return;
    }

    const float Desired = bIsMoving ? TargetSpeedCmPerSec : 0.0f;
    CurrentSpeedCmPerSec = FMath::FInterpTo(CurrentSpeedCmPerSec, Desired, DeltaTime, AccelerationInterpRate);

    if (CurrentSpeedCmPerSec > 0.1f)
    {
        CurrentDistanceCm = FMath::Min(CurrentDistanceCm + (CurrentSpeedCmPerSec * DeltaTime), SplineTrack->GetSplineLength());
        GetOwner()->SetActorTransform(SplineTrack->GetTransformAtDistance(CurrentDistanceCm));
    }
}
