#include "Core/ObjectPoolSubsystem.h"
#include "Core/IPoolableActor.h"
#include "PulseTriggerVR.h"
#include "Engine/World.h"

void UObjectPoolSubsystem::Deinitialize()
{
    Pools.Empty();
    Super::Deinitialize();
}

void UObjectPoolSubsystem::WarmupPool(TSubclassOf<AActor> ActorClass, int32 Count, int32 MaxCapacity)
{
    UClass* RawClass = ActorClass.Get();
    if (!RawClass || !GetWorld())
    {
        return;
    }

    FActorPoolBucket& Bucket = Pools.FindOrAdd(RawClass);
    Bucket.MaxCapacity = FMath::Max(Bucket.MaxCapacity, MaxCapacity);

    const int32 ExistingTotal = Bucket.InactiveActors.Num() + Bucket.ActiveActors.Num();
    const int32 Needed = FMath::Clamp(Count - ExistingTotal, 0, Bucket.MaxCapacity - ExistingTotal);

    for (int32 Index = 0; Index < Needed; ++Index)
    {
        if (AActor* NewActor = SpawnPooledInstance(RawClass))
        {
            SetActorDormantState(NewActor, true);
            if (NewActor->GetClass()->ImplementsInterface(UPoolableActor::StaticClass()))
            {
                IPoolableActor::Execute_OnReturnedToPool(NewActor);
            }
            Bucket.InactiveActors.Add(NewActor);
        }
    }

    UE_LOG(LogPulseCore, Log, TEXT("Warmed up pool for %s: %d ready (%d max)"), *RawClass->GetName(), Bucket.InactiveActors.Num(), Bucket.MaxCapacity);
}

AActor* UObjectPoolSubsystem::AcquireActor(TSubclassOf<AActor> ActorClass, const FTransform& SpawnTransform)
{
    UClass* RawClass = ActorClass.Get();
    if (!RawClass || !GetWorld())
    {
        return nullptr;
    }

    FActorPoolBucket& Bucket = Pools.FindOrAdd(RawClass);
    AActor* Acquired = nullptr;

    while (Bucket.InactiveActors.Num() > 0 && !IsValid(Acquired))
    {
        Acquired = Bucket.InactiveActors.Pop(EAllowShrinking::No);
    }

    if (!IsValid(Acquired))
    {
        const int32 TotalCount = Bucket.ActiveActors.Num() + Bucket.InactiveActors.Num();
        if (TotalCount < Bucket.MaxCapacity)
        {
            Acquired = SpawnPooledInstance(RawClass);
        }
        else if (Bucket.ActiveActors.Num() > 0)
        {
            // Evict oldest active instance in ring-buffer fashion to prevent runtime spikes
            Acquired = Bucket.ActiveActors[0];
            Bucket.ActiveActors.RemoveAt(0, 1, EAllowShrinking::No);
            if (IsValid(Acquired) && Acquired->GetClass()->ImplementsInterface(UPoolableActor::StaticClass()))
            {
                IPoolableActor::Execute_OnReturnedToPool(Acquired);
            }
        }
    }

    if (!IsValid(Acquired))
    {
        return nullptr;
    }

    Acquired->SetActorTransform(SpawnTransform, false, nullptr, ETeleportType::TeleportPhysics);
    SetActorDormantState(Acquired, false);
    Bucket.ActiveActors.Add(Acquired);

    if (Acquired->GetClass()->ImplementsInterface(UPoolableActor::StaticClass()))
    {
        IPoolableActor::Execute_OnAcquiredFromPool(Acquired);
    }

    return Acquired;
}

void UObjectPoolSubsystem::ReturnActor(AActor* ActorToReturn)
{
    if (!IsValid(ActorToReturn))
    {
        return;
    }

    UClass* RawClass = ActorToReturn->GetClass();
    FActorPoolBucket* Bucket = Pools.Find(RawClass);
    if (!Bucket)
    {
        ActorToReturn->Destroy();
        return;
    }

    const int32 Removed = Bucket->ActiveActors.RemoveSingleSwap(ActorToReturn, EAllowShrinking::No);
    if (Removed == 0 && Bucket->InactiveActors.Contains(ActorToReturn))
    {
        return; // Already pooled
    }

    if (ActorToReturn->GetClass()->ImplementsInterface(UPoolableActor::StaticClass()))
    {
        IPoolableActor::Execute_OnReturnedToPool(ActorToReturn);
    }

    SetActorDormantState(ActorToReturn, true);
    Bucket->InactiveActors.Add(ActorToReturn);
}

void UObjectPoolSubsystem::ReturnAllOfClass(TSubclassOf<AActor> ActorClass)
{
    UClass* RawClass = ActorClass.Get();
    if (!RawClass)
    {
        return;
    }

    if (FActorPoolBucket* Bucket = Pools.Find(RawClass))
    {
        TArray<TObjectPtr<AActor>> ToReturn = Bucket->ActiveActors;
        for (AActor* Actor : ToReturn)
        {
            ReturnActor(Actor);
        }
    }
}

int32 UObjectPoolSubsystem::GetActiveCount(TSubclassOf<AActor> ActorClass) const
{
    if (const FActorPoolBucket* Bucket = Pools.Find(ActorClass.Get()))
    {
        return Bucket->ActiveActors.Num();
    }
    return 0;
}

AActor* UObjectPoolSubsystem::SpawnPooledInstance(UClass* ActorClass)
{
    FActorSpawnParameters Params;
    Params.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    return GetWorld()->SpawnActor<AActor>(ActorClass, FVector(0.0f, 0.0f, -50000.0f), FRotator::ZeroRotator, Params);
}

void UObjectPoolSubsystem::SetActorDormantState(AActor* Actor, bool bDormant)
{
    if (!IsValid(Actor))
    {
        return;
    }

    Actor->SetActorHiddenInGame(bDormant);
    Actor->SetActorEnableCollision(!bDormant);
    Actor->SetActorTickEnabled(!bDormant);
}
