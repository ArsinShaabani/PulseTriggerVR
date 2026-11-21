#pragma once

#include "CoreMinimal.h"
#include "EnvironmentQuery/EnvQueryContext.h"
#include "EnvQueryContext_PlayerSpline.generated.h"

/**
 * EQS Context providing the player's projected forward spline position
 * so AI enemies evaluate tactical firing lanes ahead of the moving rail.
 */
UCLASS()
class PULSETRIGGERVR_API UEnvQueryContext_PlayerSpline : public UEnvQueryContext
{
    GENERATED_BODY()

public:
    virtual void ProvideContext(FEnvQueryInstance& QueryInstance, FEnvQueryContextData& ContextData) const override;
};
