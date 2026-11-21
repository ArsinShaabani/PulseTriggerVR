#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/IPoolableActor.h"
#include "BulletTracerPoolItem.generated.h"

class UStaticMeshComponent;

/**
 * Pooled neon bullet tracer beam recycled via UObjectPoolSubsystem (no runtime SpawnActor).
 */
UCLASS()
class PULSETRIGGERVR_API ABulletTracerPoolItem : public AActor, public IPoolableActor
{
    GENERATED_BODY()

public:
    ABulletTracerPoolItem();

    virtual void Tick(float DeltaTime) override;

    UFUNCTION(BlueprintCallable, Category = "Tracer")
    void ConfigureBeam(const FVector& StartLocation, const FVector& EndLocation, const FLinearColor& BeamColor, float LifetimeSec = 0.09f);

    virtual void OnAcquiredFromPool_Implementation() override;
    virtual void OnReturnedToPool_Implementation() override;
    virtual bool IsCurrentlyPooled_Implementation() const override { return bIsPooled; }

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Tracer")
    TObjectPtr<UStaticMeshComponent> BeamMesh = nullptr;

private:
    float RemainingLife = 0.0f;
    bool bIsPooled = true;
};
