using UnrealBuildTool;

public class PulseTriggerVR : ModuleRules
{
    public PulseTriggerVR(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        bUseUnity = true;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "HeadMountedDisplay",
            "XRBase",
            "AIModule",
            "GameplayTasks",
            "NavigationSystem",
            "Niagara",
            "UMG",
            "Slate",
            "SlateCore",
            "AudioMixer",
            "AudioExtensions",
            "SignalProcessing",
            "SignificanceManager"
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "RenderCore",
            "RHI",
            "PhysicsCore"
        });

        if (Target.Platform == UnrealTargetPlatform.Android)
        {
            PrivateDependencyModuleNames.Add("Launch");
            string PluginPath = Utils.MakePathRelativeTo(ModuleDirectory, Target.RelativeEnginePath);
            AdditionalPropertiesForReceipt.Add("AndroidPlugin", System.IO.Path.Combine(ModuleDirectory, "../../Build/Android/AndroidManifest_Quest3_UPL.xml"));
        }
    }
}
