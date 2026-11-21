#include "UI/VRMenuWidgets.h"
#include "Core/PulseGameInstance.h"
#include "Core/PulseGameMode.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "Rhythm/RhythmDataAssets.h"
#include "Systems/SaveManagerSubsystem.h"
#include "Systems/ScoringSubsystem.h"
#include "VR/VRPlayerPawn.h"
#include "Kismet/GameplayStatics.h"

void UPulseMainMenuWidget::LaunchTrack(URhythmTrackDataAsset* TrackAsset, EMusicDifficulty Difficulty, FName LevelMapName)
{
    if (UPulseGameInstance* GI = GetGameInstance<UPulseGameInstance>())
    {
        GI->SelectLevelAndDifficulty(TrackAsset, Difficulty);
    }
    UGameplayStatics::OpenLevel(GetWorld(), LevelMapName);
}

bool ULevelSelectWidget::GetTrackBestRecord(FName TrackId, EMusicDifficulty Difficulty, FLevelScoreRecord& OutRecord) const
{
    if (UGameInstance* GI = GetGameInstance())
    {
        if (USaveManagerSubsystem* SaveMgr = GI->GetSubsystem<USaveManagerSubsystem>())
        {
            return SaveMgr->GetBestLevelRecord(TrackId, Difficulty, OutRecord);
        }
    }
    return false;
}

FPlayerVRSettings USettingsWidget::LoadEditableSettings() const
{
    if (UGameInstance* GI = GetGameInstance())
    {
        if (USaveManagerSubsystem* SaveMgr = GI->GetSubsystem<USaveManagerSubsystem>())
        {
            return SaveMgr->GetCurrentSettings();
        }
    }
    return FPlayerVRSettings();
}

void USettingsWidget::CommitSettings(const FPlayerVRSettings& UpdatedSettings)
{
    if (UGameInstance* GI = GetGameInstance())
    {
        if (USaveManagerSubsystem* SaveMgr = GI->GetSubsystem<USaveManagerSubsystem>())
        {
            SaveMgr->UpdateVRSettings(UpdatedSettings);
        }
    }
    if (AVRPlayerPawn* PlayerPawn = Cast<AVRPlayerPawn>(UGameplayStatics::GetPlayerPawn(GetWorld(), 0)))
    {
        PlayerPawn->ApplySettings(UpdatedSettings);
    }
}

void UPerformanceMenuWidget::ApplyQuestPerformanceOptions(int32 FoveationLevel, float RenderScalePercent, bool bDynamicResolution)
{
    if (UGameInstance* GI = GetGameInstance())
    {
        if (USaveManagerSubsystem* SaveMgr = GI->GetSubsystem<USaveManagerSubsystem>())
        {
            FPlayerVRSettings Settings = SaveMgr->GetCurrentSettings();
            Settings.FoveationLevel = FMath::Clamp(FoveationLevel, 0, 4);
            Settings.RenderScalePercent = FMath::Clamp(RenderScalePercent, 75.0f, 130.0f);
            Settings.bDynamicResolution = bDynamicResolution;
            SaveMgr->UpdateVRSettings(Settings);
        }
    }
}

FScoreBreakdown UResultsScreenWidget::GetFinalScoreBreakdown() const
{
    if (UWorld* World = GetWorld())
    {
        if (UScoringSubsystem* Scoring = World->GetSubsystem<UScoringSubsystem>())
        {
            return Scoring->GetCurrentBreakdown();
        }
    }
    return FScoreBreakdown();
}

void UResultsScreenWidget::RetryLevel()
{
    if (APulseGameMode* GM = Cast<APulseGameMode>(UGameplayStatics::GetGameMode(GetWorld())))
    {
        GM->RestartLevelRun();
    }
}

void UResultsScreenWidget::ReturnToMainMenu()
{
    UGameplayStatics::SetGamePaused(GetWorld(), false);
    UGameplayStatics::OpenLevel(GetWorld(), FName("L_MainMenu"));
}

void UPauseMenuWidget::ResumeGame()
{
    if (APulseGameMode* GM = Cast<APulseGameMode>(UGameplayStatics::GetGameMode(GetWorld())))
    {
        GM->ResumeRun();
    }
}

void UPauseMenuWidget::RestartGame()
{
    if (APulseGameMode* GM = Cast<APulseGameMode>(UGameplayStatics::GetGameMode(GetWorld())))
    {
        GM->RestartLevelRun();
    }
}

void UPauseMenuWidget::QuitToMainMenu()
{
    UGameplayStatics::SetGamePaused(GetWorld(), false);
    UGameplayStatics::OpenLevel(GetWorld(), FName("L_MainMenu"));
}

void UCalibrationMenuWidget::CalibratePlayerHeightNow()
{
    if (AVRPlayerPawn* PlayerPawn = Cast<AVRPlayerPawn>(UGameplayStatics::GetPlayerPawn(GetWorld(), 0)))
    {
        PlayerPawn->CalibrateCurrentHeight();
    }
}

void UCalibrationMenuWidget::SetBeatLatencyOffsetMs(float OffsetMs)
{
    if (UWorld* World = GetWorld())
    {
        if (UBeatManagerSubsystem* BeatMgr = World->GetSubsystem<UBeatManagerSubsystem>())
        {
            BeatMgr->SetLatencyOffsetMs(OffsetMs);
        }
    }
    if (UGameInstance* GI = GetGameInstance())
    {
        if (USaveManagerSubsystem* SaveMgr = GI->GetSubsystem<USaveManagerSubsystem>())
        {
            FPlayerVRSettings Settings = SaveMgr->GetCurrentSettings();
            Settings.AudioLatencyOffsetMs = OffsetMs;
            SaveMgr->UpdateVRSettings(Settings);
        }
    }
}
