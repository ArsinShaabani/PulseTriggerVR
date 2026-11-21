#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "EnemyFactorySubsystem.generated.h"

class AEnemyBase;
class UEnemyArchetypeDataAsset;

/**
 * Factory Pattern + Object Pool integration for spawning data-driven enemy archetypes.
 */
UCLASS()
class PULSETRIGGERVR_API UEnemyFactorySubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "EnemyFactory")
    AEnemyBase* SpawnEnemyFromArchetype(UEnemyArchetypeDataAsset* Archetype, const FTransform& SpawnTransform, int32 FireBeatDelay = 2);
};
