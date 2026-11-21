#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "Core/PulseTypes.h"
#include "PulseGameMode.generated.h"

class ASplineTrackActor;
class ALevelDirectorActor;
class AVRPlayerPawn;
class URhythmTrackDataAsset;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnPulseMatchStateChanged, EPulseMatchState, NewState);

/**
 * Orchestrates the level lifecycle: Warmup -> Countdown -> Music Sync -> Completion -> Results.
 */
UCLASS()
class PULSETRIGGERVR_API APulseGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    APulseGameMode();

    virtual void BeginPlay() override;

    UFUNCTION(BlueprintCallable, Category = "GameFlow")
    void StartLevelRun(URhythmTrackDataAsset* OverrideTrack = nullptr);

    UFUNCTION(BlueprintCallable, Category = "GameFlow")
    void PauseRun();

    UFUNCTION(BlueprintCallable, Category = "GameFlow")
    void ResumeRun();

    UFUNCTION(BlueprintCallable, Category = "GameFlow")
    void CompleteLevelRun(bool bPlayerSurvived);

    UFUNCTION(BlueprintCallable, Category = "GameFlow")
    void RestartLevelRun();

    UPROPERTY(BlueprintAssignable, Category = "GameFlow")
    FOnPulseMatchStateChanged OnMatchStateChanged;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Pool|Warmup")
    TSubclassOf<AActor> BulletTracerPoolClass;

    UPROPERTY(EditDefaultsOnly, Category = "Pool|Warmup")
    TSubclassOf<AActor> EnemyProjectilePoolClass;

    UPROPERTY(EditDefaultsOnly, Category = "Pool|Warmup")
    TMap<EEnemyArchetype, TSubclassOf<AActor>> EnemyPoolClasses;

    UPROPERTY(EditAnywhere, Category = "Level")
    TObjectPtr<URhythmTrackDataAsset> DefaultLevelTrack;

private:
    void WarmupGameplayPools();
    void SetMatchState(EPulseMatchState NewState);

    UFUNCTION()
    void HandleSongFinished();

    UFUNCTION()
    void HandlePlayerDefeated();

    EPulseMatchState CurrentMatchState = EPulseMatchState::MainMenu;

    UPROPERTY(Transient)
    TObjectPtr<ALevelDirectorActor> CachedDirector = nullptr;

    UPROPERTY(Transient)
    TObjectPtr<ASplineTrackActor> CachedSplineTrack = nullptr;
};
