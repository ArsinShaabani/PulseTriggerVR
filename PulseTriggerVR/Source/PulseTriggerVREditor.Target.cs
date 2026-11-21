using UnrealBuildTool;
using System.Collections.Generic;

public class PulseTriggerVREditorTarget : TargetRules
{
    public PulseTriggerVREditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;
        ExtraModuleNames.AddRange(new string[] { "PulseTriggerVR" });
    }
}
