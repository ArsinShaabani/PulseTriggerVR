#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "SplineTrackActor.generated.h"

class USplineComponent;

/**
 * Designer-placed level spline rail defining player auto-progression path,
 * tangent smoothing, and world-space forward reference.
 */
UCLASS()
class PULSETRIGGERVR_API ASplineTrackActor : public AActor
{
    GENERATED_BODY()

public:
    ASplineTrackActor();

    UFUNCTION(BlueprintPure, Category = "Spline")
    USplineComponent* GetSplineComponent() const { return TrackSpline; }

    UFUNCTION(BlueprintPure, Category = "Spline")
    float GetSplineLength() const;

    UFUNCTION(BlueprintPure, Category = "Spline")
    FTransform GetTransformAtDistance(float DistanceCm) const;

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Spline")
    TObjectPtr<USplineComponent> TrackSpline = nullptr;
};
