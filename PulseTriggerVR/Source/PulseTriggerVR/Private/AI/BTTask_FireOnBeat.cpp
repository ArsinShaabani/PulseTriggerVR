#include "AI/BTTask_FireOnBeat.h"
#include "AI/EnemyBase.h"
#include "AIController.h"
#include "Kismet/GameplayStatics.h"

UBTTask_FireOnBeat::UBTTask_FireOnBeat()
{
    NodeName = TEXT("Fire On Beat");
}

EBTNodeResult::Type UBTTask_FireOnBeat::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
    AAIController* AICon = OwnerComp.GetAIOwner();
    AEnemyBase* Enemy = AICon ? Cast<AEnemyBase>(AICon->GetPawn()) : nullptr;
    APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(OwnerComp.GetWorld(), 0);

    if (!Enemy || !PlayerPawn)
    {
        return EBTNodeResult::Failed;
    }

    Enemy->ExecuteBeatAttack(PlayerPawn->GetActorLocation() + FVector(0.0f, 0.0f, 155.0f));
    return EBTNodeResult::Succeeded;
}
