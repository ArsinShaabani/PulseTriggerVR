#include "Level/SplineTrackActor.h"
#include "Components/SplineComponent.h"

ASplineTrackActor::ASplineTrackActor()
{
    PrimaryActorTick.bCanEverTick = false;
    TrackSpline = CreateDefaultSubobject<USplineComponent>(TEXT("TrackSpline"));
    RootComponent = TrackSpline;
}

float ASplineTrackActor::GetSplineLength() const
{
    return TrackSpline ? TrackSpline->GetSplineLength() : 0.0f;
}

FTransform ASplineTrackActor::GetTransformAtDistance(float DistanceCm) const
{
    if (!TrackSpline)
    {
        return FTransform::Identity;
    }
    const float ClampedDist = FMath::Clamp(DistanceCm, 0.0f, TrackSpline->GetSplineLength());
    const FVector Loc = TrackSpline->GetLocationAtDistanceAlongSpline(ClampedDist, ESplineCoordinateSpace::World);
    FRotator Rot = TrackSpline->GetRotationAtDistanceAlongSpline(ClampedDist, ESplineCoordinateSpace::World);
    // Keep horizon strictly level (zero roll/pitch) for VR vestibular comfort
    Rot.Pitch = 0.0f;
    Rot.Roll = 0.0f;
    return FTransform(Rot, Loc);
}
