#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Core/PulseTypes.h"
#include "AudioTimelineComponent.generated.h"

/**
 * Component allowing Blueprint actors (obstacles, lights, doors) to subscribe
 * directly to filtered 1/4, 1/8, or 1/16 beat events without manual subsystem binding.
 */
UCLASS(ClassGroup = (Rhythm), meta = (BlueprintSpawnableComponent))
class PULSETRIGGERVR_API UAudioTimelineComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UAudioTimelineComponent();

    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Rhythm")
    EBeatSubdivision ListenSubdivision = EBeatSubdivision::Quarter;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTimelineBeatFired, const FBeatEventPayload&, BeatPayload);

    UPROPERTY(BlueprintAssignable, Category = "Rhythm")
    FOnTimelineBeatFired OnBeatFired;

private:
    UFUNCTION()
    void HandleBeatEvent(const FBeatEventPayload& Payload);
};
