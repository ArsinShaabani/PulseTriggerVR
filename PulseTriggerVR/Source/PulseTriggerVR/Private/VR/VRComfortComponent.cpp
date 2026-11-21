#include "VR/VRComfortComponent.h"
#include "HeadMountedDisplayFunctionLibrary.h"
#include "IXRTrackingSystem.h"
#include "Engine/Engine.h"
#include "Materials/MaterialParameterCollectionInstance.h"
#include "PulseTriggerVR.h"

UVRComfortComponent::UVRComfortComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UVRComfortComponent::BeginPlay()
{
    Super::BeginPlay();

    if (UHeadMountedDisplayFunctionLibrary::IsHeadMountedDisplayEnabled())
    {
        const FVector2D PlayBounds = UHeadMountedDisplayFunctionLibrary::GetPlayAreaBounds(EHMDTrackingOrigin::Stage);
        if (!PlayBounds.IsNearlyZero())
        {
            PlayAreaHalfWidth = PlayBounds.X * 0.5f;
            PlayAreaHalfDepth = PlayBounds.Y * 0.5f;
        }
    }
}

void UVRComfortComponent::ApplyVRSettings(const FPlayerVRSettings& Settings)
{
    CachedSettings = Settings;
}

float UVRComfortComponent::CalibrateEyeHeight(float CurrentHMDLocalZ)
{
    const float SafeHeight = FMath::Clamp(CurrentHMDLocalZ, 90.0f, 220.0f);
    CachedSettings.CalibratedEyeHeightCm = SafeHeight;
    const float OffsetZ = TargetStandardEyeHeightCm - SafeHeight;
    UE_LOG(LogPulseVR, Log, TEXT("Calibrated Eye Height: %.1f cm (Applied OffsetZ: %.1f cm)"), SafeHeight, OffsetZ);
    return OffsetZ;
}

void UVRComfortComponent::SetTargetMovementSpeedNormalized(float InNormalizedSpeed)
{
    NormalizedSpeed = FMath::Clamp(InNormalizedSpeed, 0.0f, 1.5f);
}

void UVRComfortComponent::TickComponent(float DeltaTime, ELevelTick TickType, FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    // Smooth comfort vignette tunneling based on motion speed and user comfort setting
    const float TargetStrength = NormalizedSpeed * CachedSettings.ComfortVignetteIntensity;
    CurrentVignetteStrength = FMath::FInterpTo(CurrentVignetteStrength, TargetStrength, DeltaTime, 8.0f);

    if (ComfortMPC && GetWorld())
    {
        if (UMaterialParameterCollectionInstance* Inst = GetWorld()->GetParameterCollectionInstance(ComfortMPC))
        {
            // 1.0 = fully open, 0.45 = narrowed comfort tunnel
            const float Radius = FMath::Lerp(1.0f, 0.48f, CurrentVignetteStrength);
            Inst->SetScalarParameterValue(VignetteParamName, Radius);
        }
    }

    // Check Guardian boundary at 10 Hz to minimize overhead
    if (CachedSettings.bGuardianWarningEnabled)
    {
        GuardianCheckAccumulator += DeltaTime;
        if (GuardianCheckAccumulator >= 0.1f)
        {
            GuardianCheckAccumulator = 0.0f;
            FRotator HMDRot;
            FVector HMDPos;
            UHeadMountedDisplayFunctionLibrary::GetOrientationAndPosition(HMDRot, HMDPos);
            EvaluateGuardianBoundary(HMDPos);
        }
    }
}

void UVRComfortComponent::EvaluateGuardianBoundary(const FVector& HMDLocalPos)
{
    const float DistX = PlayAreaHalfWidth - FMath::Abs(HMDLocalPos.X);
    const float DistY = PlayAreaHalfDepth - FMath::Abs(HMDLocalPos.Y);
    const float MinEdgeDist = FMath::Min(DistX, DistY);
    const bool bNear = (MinEdgeDist <= GuardianWarningThresholdCm);

    if (bNear != bIsNearGuardian)
    {
        bIsNearGuardian = bNear;
        OnGuardianWarningChanged.Broadcast(bIsNearGuardian);
    }
}
