#pragma once

#include "CoreMinimal.h"
#include "AIController.h"
#include "EnemyAIController.generated.h"

class UBehaviorTreeComponent;
class UBlackboardComponent;
class UEnemyArchetypeDataAsset;

/**
 * AIController driving Behavior Trees, Blackboard keys, and EQS spatial queries.
 */
UCLASS()
class PULSETRIGGERVR_API AEnemyAIController : public AAIController
{
    GENERATED_BODY()

public:
    AEnemyAIController();

    UFUNCTION(BlueprintCallable, Category = "AI")
    void StartEnemyBehavior(UEnemyArchetypeDataAsset* Archetype);

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "AI")
    TObjectPtr<UBehaviorTreeComponent> BehaviorTreeComp = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "AI")
    TObjectPtr<UBlackboardComponent> BlackboardComp = nullptr;
};
