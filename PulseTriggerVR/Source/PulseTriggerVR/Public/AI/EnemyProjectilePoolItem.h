#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/IPoolableActor.h"
#include "EnemyProjectilePoolItem.generated.h"

class USphereComponent;
class UStaticMeshComponent;

/**
 * Pooled slow-motion dodgeable neon enemy projectile.
 * Detects both HeadHitbox (damage) and NearMissDodgeSphere (Perfect Dodge bonus).
 */
UCLASS()
class PULSETRIGGERVR_API AEnemyProjectilePoolItem : public AActor, public IPoolableActor
{
    GENERATED_BODY()

public:
    AEnemyProjectilePoolItem();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;

    UFUNCTION(BlueprintCallable, Category = "Projectile")
    void LaunchProjectile(const FVector& StartLocation, const FVector& VelocityVector, int32 InDamage = 1, float MaxLifeSec = 4.5f);

    virtual void OnAcquiredFromPool_Implementation() override;
    virtual void OnReturnedToPool_Implementation() override;
    virtual bool IsCurrentlyPooled_Implementation() const override { return bIsPooled; }

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Projectile")
    TObjectPtr<USphereComponent> CollisionSphere = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Projectile")
    TObjectPtr<UStaticMeshComponent> ProjectileMesh = nullptr;

private:
    UFUNCTION()
    void HandleOverlapBegin(UPrimitiveComponent* OverlappedComp, AActor* OtherActor,
        UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

    void ReturnSelfToPool();

    FVector CurrentVelocity = FVector::ZeroVector;
    int32 Damage = 1;
    float RemainingLife = 0.0f;
    bool bIsPooled = true;
    bool bTriggeredNearMiss = false;
};
