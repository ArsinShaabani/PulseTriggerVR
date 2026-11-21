#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/PulseTypes.h"
#include "BeatVisualizerActor.generated.h"

class UMaterialParameterCollection;
class UMaterialParameterCollectionInstance;

/**
 * Drives global neon shader MaterialParameterCollection (MPC_BeatPulse)
 * and environmental light pulses in lockstep with the beat clock.
 * Zero dynamic light spawning: updates scalar shader params for 90 FPS performance.
 */
UCLASS()
class PULSETRIGGERVR_API ABeatVisualizerActor : public AActor
{
    GENERATED_BODY()

public:
    ABeatVisualizerActor();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;

protected:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Visuals")
    TObjectPtr<UMaterialParameterCollection> BeatParameterCollection = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Visuals")
    FName BeatIntensityParamName = TEXT("BeatIntensity");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Visuals")
    FName BeatPhaseParamName = TEXT("BeatPhase");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Visuals")
    float DecaySpeed = 7.5f;

private:
    UFUNCTION()
    void OnQuarterBeat(const FBeatEventPayload& Payload);

    UPROPERTY(Transient)
    TObjectPtr<UMaterialParameterCollectionInstance> MPCInstance = nullptr;

    float CurrentPulseIntensity = 0.0f;
};
