#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Core/PulseTypes.h"
#include "VRComfortComponent.generated.h"

class UMaterialParameterCollection;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGuardianProximityWarning, bool, bNearBoundary);

/**
 * Manages VR comfort tunneling vignette, height calibration, seated/standing offsets,
 * and OpenXR Guardian play-area boundary awareness.
 */
UCLASS(ClassGroup = (VR), meta = (BlueprintSpawnableComponent))
class PULSETRIGGERVR_API UVRComfortComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UVRComfortComponent();

    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction) override;

    UFUNCTION(BlueprintCallable, Category = "VR|Calibration")
    void ApplyVRSettings(const FPlayerVRSettings& Settings);

    UFUNCTION(BlueprintCallable, Category = "VR|Calibration")
    float CalibrateEyeHeight(float CurrentHMDLocalZ);

    UFUNCTION(BlueprintCallable, Category = "VR|Comfort")
    void SetTargetMovementSpeedNormalized(float NormalizedSpeed);

    UFUNCTION(BlueprintPure, Category = "VR|Guardian")
    bool IsNearGuardianBoundary() const { return bIsNearGuardian; }

    UPROPERTY(BlueprintAssignable, Category = "VR|Guardian")
    FOnGuardianProximityWarning OnGuardianWarningChanged;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "VR|Comfort")
    TObjectPtr<UMaterialParameterCollection> ComfortMPC = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Comfort")
    FName VignetteParamName = TEXT("ComfortVignetteRadius");

    UPROPERTY(EditDefaultsOnly, Category = "VR|Guardian")
    float GuardianWarningThresholdCm = 35.0f;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Calibration")
    float TargetStandardEyeHeightCm = 170.0f;

private:
    void EvaluateGuardianBoundary(const FVector& HMDLocalPos);

    FPlayerVRSettings CachedSettings;
    float NormalizedSpeed = 0.0f;
    float CurrentVignetteStrength = 0.0f;
    float PlayAreaHalfWidth = 120.0f;
    float PlayAreaHalfDepth = 120.0f;
    bool bIsNearGuardian = false;
    float GuardianCheckAccumulator = 0.0f;
};
