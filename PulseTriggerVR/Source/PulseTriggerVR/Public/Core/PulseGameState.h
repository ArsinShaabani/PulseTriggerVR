#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "Core/PulseTypes.h"
#include "PulseGameState.generated.h"

UCLASS()
class PULSETRIGGERVR_API APulseGameState : public AGameStateBase
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category = "GameState")
    EPulseMatchState GetPulseMatchState() const { return MatchState; }

    void SetPulseMatchState(EPulseMatchState NewState) { MatchState = NewState; }

private:
    UPROPERTY(VisibleInstanceOnly, Category = "GameState")
    EPulseMatchState MatchState = EPulseMatchState::MainMenu;
};
