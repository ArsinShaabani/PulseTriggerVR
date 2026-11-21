#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "ObjectPoolSubsystem.generated.h"

USTRUCT()
struct FActorPoolBucket
{
    GENERATED_BODY()

    UPROPERTY()
    TArray<TObjectPtr<AActor>> InactiveActors;

    UPROPERTY()
    TArray<TObjectPtr<AActor>> ActiveActors;

    int32 MaxCapacity = 64;
};

/**
 * Pre-allocates and recycles actors (tracers, projectiles, decals, enemies)
 * to eliminate runtime GC spikes and maintain 90 FPS on Meta Quest 3.
 */
UCLASS()
class PULSETRIGGERVR_API UObjectPoolSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category = "ObjectPool")
    void WarmupPool(TSubclassOf<AActor> ActorClass, int32 Count, int32 MaxCapacity = 128);

    UFUNCTION(BlueprintCallable, Category = "ObjectPool", meta = (DeterminesOutputType = "ActorClass"))
    AActor* AcquireActor(TSubclassOf<AActor> ActorClass, const FTransform& SpawnTransform);

    UFUNCTION(BlueprintCallable, Category = "ObjectPool")
    void ReturnActor(AActor* ActorToReturn);

    UFUNCTION(BlueprintCallable, Category = "ObjectPool")
    void ReturnAllOfClass(TSubclassOf<AActor> ActorClass);

    UFUNCTION(BlueprintPure, Category = "ObjectPool")
    int32 GetActiveCount(TSubclassOf<AActor> ActorClass) const;

private:
    UPROPERTY()
    TMap<TObjectPtr<UClass>, FActorPoolBucket> Pools;

    AActor* SpawnPooledInstance(UClass* ActorClass);
    void SetActorDormantState(AActor* Actor, bool bDormant);
};
