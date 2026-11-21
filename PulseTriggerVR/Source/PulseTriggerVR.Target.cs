using UnrealBuildTool;
using System.Collections.Generic;

public class PulseTriggerVRTarget : TargetRules
{
    public PulseTriggerVRTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;
        ExtraModuleNames.AddRange(new string[] { "PulseTriggerVR" });

        // Quest 3 Shipping & Performance Optimizations
        if (Configuration == UnrealTargetConfiguration.Shipping)
        {
            bUseLoggingInShipping = false;
            bUseChecksInShipping = false;
        }
    }
}
