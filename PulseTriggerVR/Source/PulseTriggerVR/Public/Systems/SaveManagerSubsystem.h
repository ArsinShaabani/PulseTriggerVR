#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Core/PulseTypes.h"
#include "SaveManagerSubsystem.generated.h"

class UPulseSaveGame;

/**
 * Central save/load manager backed by UGameplayStatics::SaveGameToSlot.
 */
UCLASS()
class PULSETRIGGERVR_API USaveManagerSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "SaveSystem")
    void LoadOrCreateSaveGame();

    UFUNCTION(BlueprintCallable, Category = "SaveSystem")
    void SaveToDisk();

    UFUNCTION(BlueprintCallable, Category = "SaveSystem")
    void UpdateVRSettings(const FPlayerVRSettings& NewSettings);

    UFUNCTION(BlueprintCallable, Category = "SaveSystem")
    void RecordLevelResult(FName LevelId, EMusicDifficulty Difficulty, const FScoreBreakdown& Breakdown);

    UFUNCTION(BlueprintCallable, Category = "SaveSystem")
    void UnlockContent(FName ContentId);

    UFUNCTION(BlueprintPure, Category = "SaveSystem")
    bool IsContentUnlocked(FName ContentId) const;

    UFUNCTION(BlueprintPure, Category = "SaveSystem")
    FPlayerVRSettings GetCurrentSettings() const;

    UFUNCTION(BlueprintPure, Category = "SaveSystem")
    bool GetBestLevelRecord(FName LevelId, EMusicDifficulty Difficulty, FLevelScoreRecord& OutRecord) const;

private:
    void EvaluateAchievements(const FScoreBreakdown& Breakdown);

    static const FString SaveSlotName;

    UPROPERTY(Transient)
    TObjectPtr<UPulseSaveGame> CurrentSave = nullptr;
};
