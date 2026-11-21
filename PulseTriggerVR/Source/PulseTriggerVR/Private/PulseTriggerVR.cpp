#include "PulseTriggerVR.h"
#include "Modules/ModuleManager.h"

DEFINE_LOG_CATEGORY(LogPulseCore);
DEFINE_LOG_CATEGORY(LogPulseRhythm);
DEFINE_LOG_CATEGORY(LogPulseCombat);
DEFINE_LOG_CATEGORY(LogPulseAI);
DEFINE_LOG_CATEGORY(LogPulseVR);
DEFINE_LOG_CATEGORY(LogPulseAudio);

class FPulseTriggerVRModule : public FDefaultGameModuleImpl
{
public:
    virtual void StartupModule() override
    {
        UE_LOG(LogPulseCore, Log, TEXT("PulseTriggerVR Module Initialized (Quest 3 90Hz Target)"));
    }

    virtual void ShutdownModule() override
    {
        UE_LOG(LogPulseCore, Log, TEXT("PulseTriggerVR Module Shutdown"));
    }
};

IMPLEMENT_PRIMARY_GAME_MODULE(FPulseTriggerVRModule, PulseTriggerVR, "PulseTriggerVR");
