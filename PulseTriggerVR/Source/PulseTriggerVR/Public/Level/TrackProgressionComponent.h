#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "TrackProgressionComponent.generated.h"

class ASplineTrackActor;

/**
 * Moves the VR player smoothly along the level spline with adjustable speed,
 * smooth acceleration damping, and zero pitch/roll vestibular lock.
 */
UCLASS(ClassGroup = (Movement), meta = (BlueprintSpawnableComponent))
class PULSETRIGGERVR_API UTrackProgressionComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UTrackProgressionComponent();

    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

    UFUNCTION(BlueprintCallable, Category = "Progression")
    void BindSplineTrack(ASplineTrackActor* InSplineTrack);

    UFUNCTION(BlueprintCallable, Category = "Progression")
    void StartProgression();

    UFUNCTION(BlueprintCallable, Category = "Progression")
    void StopProgression();

    UFUNCTION(BlueprintCallable, Category = "Progression")
    void SetTargetSpeedCmPerSec(float NewSpeedCmPerSec);

    UFUNCTION(BlueprintPure, Category = "Progression")
    float GetCurrentDistanceCm() const { return CurrentDistanceCm; }

    UFUNCTION(BlueprintPure, Category = "Progression")
    float GetNormalizedSpeedRatio() const;

protected:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression")
    float BaseSpeedCmPerSec = 650.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progression")
    float AccelerationInterpRate = 3.5f;

private:
    UPROPERTY(Transient)
    TObjectPtr<ASplineTrackActor> SplineTrack = nullptr;

    float TargetSpeedCmPerSec = 650.0f;
    float CurrentSpeedCmPerSec = 0.0f;
    float CurrentDistanceCm = 0.0f;
    bool bIsMoving = false;
};
