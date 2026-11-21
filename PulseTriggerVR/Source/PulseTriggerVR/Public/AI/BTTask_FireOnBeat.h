#pragma once

#include "CoreMinimal.h"
#include "BehaviorTree/BTTaskNode.h"
#include "BTTask_FireOnBeat.generated.h"

/**
 * Behavior Tree Task executing enemy attack synchronized to the current beat window.
 */
UCLASS()
class PULSETRIGGERVR_API UBTTask_FireOnBeat : public UBTTaskNode
{
    GENERATED_BODY()

public:
    UBTTask_FireOnBeat();

    virtual EBTNodeResult::Type ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory) override;
};
