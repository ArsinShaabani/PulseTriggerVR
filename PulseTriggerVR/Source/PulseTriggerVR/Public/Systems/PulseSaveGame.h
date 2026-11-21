#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Core/PulseTypes.h"
#include "PulseSaveGame.generated.h"

/**
 * Persistent Unreal SaveGame storing VR settings, high scores,
 * unlocked tracks/skins, lifetime statistics, and achievements.
 */
UCLASS()
class PULSETRIGGERVR_API UPulseSaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Settings")
    FPlayerVRSettings PlayerSettings;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Progress")
    TArray<FLevelScoreRecord> LevelRecords;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Unlocks")
    TSet<FName> UnlockedContentIds;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Achievements")
    TSet<FName> UnlockedAchievements;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
    int64 LifetimeShotsFired = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
    int64 LifetimeShotsHit = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
    int64 LifetimeEnemiesEliminated = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
    int64 LifetimePerfectDodges = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
    int32 HighestMaxComboEver = 0;
};
