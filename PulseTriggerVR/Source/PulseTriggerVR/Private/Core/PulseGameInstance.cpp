#include "Core/PulseGameInstance.h"
#include "PulseTriggerVR.h"
#include "Systems/SaveManagerSubsystem.h"
#include "HeadMountedDisplayFunctionLibrary.h"
#include "HAL/IConsoleManager.h"

void UPulseGameInstance::Init()
{
    Super::Init();

    if (USaveManagerSubsystem* SaveSys = GetSubsystem<USaveManagerSubsystem>())
    {
        SaveSys->LoadOrCreateSaveGame();
        ApplyQuestPerformanceProfile(SaveSys->GetCurrentSettings());
    }

    // Enforce OpenXR 90 Hz display rate on Meta Quest 3
    if (UHeadMountedDisplayFunctionLibrary::IsHeadMountedDisplayEnabled())
    {
        UHeadMountedDisplayFunctionLibrary::SetTrackingOrigin(EHMDTrackingOrigin::Stage);
        UE_LOG(LogPulseVR, Log, TEXT("OpenXR HMD Active. Stage tracking origin configured. Target %.1f Hz"), TargetRefreshRateHz);
    }
}

void UPulseGameInstance::SelectLevelAndDifficulty(URhythmTrackDataAsset* TrackAsset, EMusicDifficulty Difficulty)
{
    SelectedTrack = TrackAsset;
    SelectedDifficulty = Difficulty;
}

void UPulseGameInstance::ApplyQuestPerformanceProfile(const FPlayerVRSettings& Settings)
{
    auto SetCVarInt = [](const TCHAR* Name, int32 Value)
    {
        if (IConsoleVariable* Var = IConsoleManager::Get().FindConsoleVariable(Name))
        {
            Var->Set(Value, ECVF_SetByGameSetting);
        }
    };

    auto SetCVarFloat = [](const TCHAR* Name, float Value)
    {
        if (IConsoleVariable* Var = IConsoleManager::Get().FindConsoleVariable(Name))
        {
            Var->Set(Value, ECVF_SetByGameSetting);
        }
    };

    SetCVarInt(TEXT("xr.OpenXR.FoveationLevel"), FMath::Clamp(Settings.FoveationLevel, 0, 4));
    SetCVarInt(TEXT("r.DynamicRes.OperationMode"), Settings.bDynamicResolution ? 1 : 0);
    SetCVarFloat(TEXT("r.ScreenPercentage"), FMath::Clamp(Settings.RenderScalePercent, 75.0f, 130.0f));

    UE_LOG(LogPulseCore, Log, TEXT("Applied Quest 3 Performance Profile: FFR=%d, DynRes=%d, Scale=%.0f%%"),
        Settings.FoveationLevel, Settings.bDynamicResolution ? 1 : 0, Settings.RenderScalePercent);
}
