#include "AI/EnemyFactorySubsystem.h"
#include "AI/EnemyDataAsset.h"
#include "AI/EnemyBase.h"
#include "Core/ObjectPoolSubsystem.h"
#include "PulseTriggerVR.h"

AEnemyBase* UEnemyFactorySubsystem::SpawnEnemyFromArchetype(UEnemyArchetypeDataAsset* Archetype, const FTransform& SpawnTransform, int32 FireBeatDelay)
{
    if (!Archetype || !Archetype->EnemyActorClass)
    {
        UE_LOG(LogPulseAI, Warning, TEXT("EnemyFactory failed: Missing Archetype or EnemyActorClass"));
        return nullptr;
    }

    UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>();
    if (!PoolSys)
    {
        return nullptr;
    }

    AEnemyBase* Enemy = Cast<AEnemyBase>(PoolSys->AcquireActor(Archetype->EnemyActorClass, SpawnTransform));
    if (Enemy)
    {
        Enemy->InitializeFromArchetype(Archetype, FireBeatDelay);
    }
    return Enemy;
}
