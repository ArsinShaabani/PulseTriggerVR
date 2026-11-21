#include "AI/EnvQueryContext_PlayerSpline.h"
#include "EnvironmentQuery/EnvQueryTypes.h"
#include "EnvironmentQuery/Items/EnvQueryItemType_Point.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/Pawn.h"

void UEnvQueryContext_PlayerSpline::ProvideContext(FEnvQueryInstance& QueryInstance, FEnvQueryContextData& ContextData) const
{
    UObject* QueryOwner = QueryInstance.Owner.Get();
    APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(QueryOwner, 0);
    if (!PlayerPawn)
    {
        return;
    }

    // Project 1200cm ahead along the player's spline forward vector
    const FVector ForwardPoint = PlayerPawn->GetActorLocation() + (PlayerPawn->GetActorForwardVector() * 1200.0f);
    UEnvQueryItemType_Point::SetContextHelper(ContextData, ForwardPoint);
}
