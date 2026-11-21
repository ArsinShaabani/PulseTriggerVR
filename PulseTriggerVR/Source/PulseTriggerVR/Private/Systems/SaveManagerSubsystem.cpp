#include "Systems/SaveManagerSubsystem.h"
#include "Systems/PulseSaveGame.h"
#include "Systems/PulseAudioSubsystem.h"
#include "Core/PulseGameInstance.h"
#include "Kismet/GameplayStatics.h"
#include "PulseTriggerVR.h"

const FString USaveManagerSubsystem::SaveSlotName = TEXT("PulseTriggerVR_Profile_01");

void USaveManagerSubsystem::LoadOrCreateSaveGame()
{
    if (UGameplayStatics::DoesSaveGameExist(SaveSlotName, 0))
    {
        CurrentSave = Cast<UPulseSaveGame>(UGameplayStatics::LoadGameFromSlot(SaveSlotName, 0));
    }

    if (!CurrentSave)
    {
        CurrentSave = Cast<UPulseSaveGame>(UGameplayStatics::CreateSaveGameObject(UPulseSaveGame::StaticClass()));
        CurrentSave->UnlockedContentIds.Add(TEXT("Level_NeonSyndicate"));
        CurrentSave->UnlockedContentIds.Add(TEXT("Weapon_SemiAutoPistol"));
        SaveToDisk();
    }
}

void USaveManagerSubsystem::SaveToDisk()
{
    if (CurrentSave)
    {
        UGameplayStatics::SaveGameToSlot(CurrentSave, SaveSlotName, 0);
    }
}

void USaveManagerSubsystem::UpdateVRSettings(const FPlayerVRSettings& NewSettings)
{
    if (!CurrentSave)
    {
        LoadOrCreateSaveGame();
    }

    CurrentSave->PlayerSettings = NewSettings;
    if (UPulseGameInstance* GI = Cast<UPulseGameInstance>(GetGameInstance()))
    {
        GI->ApplyQuestPerformanceProfile(NewSettings);
    }
    if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
    {
        Audio->ApplyAudioVolumes(NewSettings.MasterVolume, NewSettings.MusicVolume, NewSettings.SfxVolume);
    }
    SaveToDisk();
}

void USaveManagerSubsystem::RecordLevelResult(FName LevelId, EMusicDifficulty Difficulty, const FScoreBreakdown& Breakdown)
{
    if (!CurrentSave)
    {
        LoadOrCreateSaveGame();
    }

    CurrentSave->LifetimeShotsFired += Breakdown.ShotsFired;
    CurrentSave->LifetimeShotsHit += Breakdown.ShotsHit;
    CurrentSave->LifetimePerfectDodges += Breakdown.PerfectDodges;
    CurrentSave->HighestMaxComboEver = FMath::Max(CurrentSave->HighestMaxComboEver, Breakdown.MaxCombo);

    FLevelScoreRecord* Found = CurrentSave->LevelRecords.FindByPredicate([&](const FLevelScoreRecord& Rec)
    {
        return Rec.LevelId == LevelId && Rec.Difficulty == Difficulty;
    });

    if (!Found)
    {
        FLevelScoreRecord NewRec;
        NewRec.LevelId = LevelId;
        NewRec.Difficulty = Difficulty;
        NewRec.BestScore = Breakdown.TotalScore;
        NewRec.BestCombo = Breakdown.MaxCombo;
        NewRec.BestAccuracy = Breakdown.AccuracyPercent;
        NewRec.BestGrade = Breakdown.FinalGrade;
        NewRec.bCleared = true;
        CurrentSave->LevelRecords.Add(NewRec);
    }
    else
    {
        Found->bCleared = true;
        Found->BestScore = FMath::Max(Found->BestScore, Breakdown.TotalScore);
        Found->BestCombo = FMath::Max(Found->BestCombo, Breakdown.MaxCombo);
        Found->BestAccuracy = FMath::Max(Found->BestAccuracy, Breakdown.AccuracyPercent);
        if (static_cast<uint8>(Breakdown.FinalGrade) > static_cast<uint8>(Found->BestGrade))
        {
            Found->BestGrade = Breakdown.FinalGrade;
        }
    }

    EvaluateAchievements(Breakdown);
    SaveToDisk();
}

void USaveManagerSubsystem::EvaluateAchievements(const FScoreBreakdown& Breakdown)
{
    if (!CurrentSave)
    {
        return;
    }

    if (Breakdown.FinalGrade == EPerformanceGrade::SPlus)
    {
        CurrentSave->UnlockedAchievements.Add(TEXT("ACH_Perfectionist_SPlus"));
    }
    if (Breakdown.DamageTaken == 0)
    {
        CurrentSave->UnlockedAchievements.Add(TEXT("ACH_Untouchable"));
    }
    if (CurrentSave->LifetimePerfectDodges >= 25)
    {
        CurrentSave->UnlockedAchievements.Add(TEXT("ACH_BulletDancer"));
    }
}

void USaveManagerSubsystem::UnlockContent(FName ContentId)
{
    if (!CurrentSave)
    {
        LoadOrCreateSaveGame();
    }
    CurrentSave->UnlockedContentIds.Add(ContentId);
    SaveToDisk();
}

bool USaveManagerSubsystem::IsContentUnlocked(FName ContentId) const
{
    return CurrentSave ? CurrentSave->UnlockedContentIds.Contains(ContentId) : false;
}

FPlayerVRSettings USaveManagerSubsystem::GetCurrentSettings() const
{
    return CurrentSave ? CurrentSave->PlayerSettings : FPlayerVRSettings();
}

bool USaveManagerSubsystem::GetBestLevelRecord(FName LevelId, EMusicDifficulty Difficulty, FLevelScoreRecord& OutRecord) const
{
    if (!CurrentSave)
    {
        return false;
    }
    for (const FLevelScoreRecord& Rec : CurrentSave->LevelRecords)
    {
        if (Rec.LevelId == LevelId && Rec.Difficulty == Difficulty)
        {
            OutRecord = Rec;
            return true;
        }
    }
    return false;
}
