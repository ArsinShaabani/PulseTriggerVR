#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "IPoolableActor.generated.h"

UINTERFACE(MinimalAPI, Blueprintable)
class UPoolableActor : public UInterface
{
    GENERATED_BODY()
};

/**
 * Contract for any actor managed by UObjectPoolSubsystem (zero runtime SpawnActor).
 */
class PULSETRIGGERVR_API IPoolableActor
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "ObjectPool")
    void OnAcquiredFromPool();

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "ObjectPool")
    void OnReturnedToPool();

    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "ObjectPool")
    bool IsCurrentlyPooled() const;
};
