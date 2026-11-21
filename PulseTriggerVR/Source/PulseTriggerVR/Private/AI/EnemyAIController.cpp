#include "AI/EnemyAIController.h"
#include "AI/EnemyDataAsset.h"
#include "BehaviorTree/BehaviorTree.h"
#include "BehaviorTree/BehaviorTreeComponent.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "Kismet/GameplayStatics.h"

AEnemyAIController::AEnemyAIController()
{
    BehaviorTreeComp = CreateDefaultSubobject<UBehaviorTreeComponent>(TEXT("BehaviorTreeComp"));
    BlackboardComp = CreateDefaultSubobject<UBlackboardComponent>(TEXT("BlackboardComp"));
}

void AEnemyAIController::StartEnemyBehavior(UEnemyArchetypeDataAsset* Archetype)
{
    if (!Archetype || !Archetype->BehaviorTreeAsset)
    {
        return;
    }

    if (UseBlackboard(Archetype->BehaviorTreeAsset->BlackboardAsset, BlackboardComp))
    {
        BlackboardComp->SetValueAsObject(TEXT("PlayerTarget"), UGameplayStatics::GetPlayerPawn(GetWorld(), 0));
        RunBehaviorTree(Archetype->BehaviorTreeAsset);
    }
}
