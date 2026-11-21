#include "VR/VRPlayerPawn.h"
#include "VR/VRComfortComponent.h"
#include "Level/TrackProgressionComponent.h"
#include "Weapons/WeaponBase.h"
#include "Core/PulseGameMode.h"
#include "Systems/ScoringSubsystem.h"
#include "Systems/SaveManagerSubsystem.h"
#include "Camera/CameraComponent.h"
#include "MotionControllerComponent.h"
#include "Components/SphereComponent.h"
#include "Components/WidgetInteractionComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "HeadMountedDisplayFunctionLibrary.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"
#include "PulseTriggerVR.h"

AVRPlayerPawn::AVRPlayerPawn()
{
    PrimaryActorTick.bCanEverTick = true;

    RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    VROrigin = CreateDefaultSubobject<USceneComponent>(TEXT("VROrigin"));
    VROrigin->SetupAttachment(RootComponent);

    HMD_Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("HMD_Camera"));
    HMD_Camera->SetupAttachment(VROrigin);
    HMD_Camera->bLockToHmd = true;

    // Physical head hitbox for bullet collision (dodging with head movement matters!)
    HeadHitbox = CreateDefaultSubobject<USphereComponent>(TEXT("HeadHitbox"));
    HeadHitbox->SetupAttachment(HMD_Camera);
    HeadHitbox->SetSphereRadius(14.0f);
    HeadHitbox->SetCollisionProfileName(TEXT("OverlapAllDynamic"));

    // Larger near-miss zone awards Perfect Dodge when bullets graze past head
    NearMissDodgeSphere = CreateDefaultSubobject<USphereComponent>(TEXT("NearMissDodgeSphere"));
    NearMissDodgeSphere->SetupAttachment(HMD_Camera);
    NearMissDodgeSphere->SetSphereRadius(52.0f);
    NearMissDodgeSphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));

    LeftController = CreateDefaultSubobject<UMotionControllerComponent>(TEXT("LeftController"));
    LeftController->SetupAttachment(VROrigin);
    LeftController->SetTrackingMotionSource(FName("LeftAim"));

    RightController = CreateDefaultSubobject<UMotionControllerComponent>(TEXT("RightController"));
    RightController->SetupAttachment(VROrigin);
    RightController->SetTrackingMotionSource(FName("RightAim"));

    RightWidgetLaser = CreateDefaultSubobject<UWidgetInteractionComponent>(TEXT("RightWidgetLaser"));
    RightWidgetLaser->SetupAttachment(RightController);
    RightWidgetLaser->InteractionDistance = 1500.0f;
    RightWidgetLaser->bShowDebug = false;

    GazeFallbackPointer = CreateDefaultSubobject<UWidgetInteractionComponent>(TEXT("GazeFallbackPointer"));
    GazeFallbackPointer->SetupAttachment(HMD_Camera);
    GazeFallbackPointer->InteractionDistance = 1500.0f;
    GazeFallbackPointer->InteractionSource = EWidgetInteractionSource::CenterScreen;

    TrackProgression = CreateDefaultSubobject<UTrackProgressionComponent>(TEXT("TrackProgression"));
    ComfortComponent = CreateDefaultSubobject<UVRComfortComponent>(TEXT("ComfortComponent"));
}

void AVRPlayerPawn::BeginPlay()
{
    Super::BeginPlay();

    if (APlayerController* PC = Cast<APlayerController>(GetController()))
    {
        if (UEnhancedInputLocalPlayerSubsystem* InputSys = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
        {
            if (VRGameplayMappingContext)
            {
                InputSys->AddMappingContext(VRGameplayMappingContext, 0);
            }
        }
    }

    FPlayerVRSettings LoadedSettings;
    if (UGameInstance* GI = GetGameInstance())
    {
        if (USaveManagerSubsystem* SaveMgr = GI->GetSubsystem<USaveManagerSubsystem>())
        {
            LoadedSettings = SaveMgr->GetCurrentSettings();
        }
    }

    ApplySettings(LoadedSettings);
}

void AVRPlayerPawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    if (UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent))
    {
        if (IA_FireLeft)
        {
            EIC->BindAction(IA_FireLeft, ETriggerEvent::Started, this, &AVRPlayerPawn::HandleFireLeft);
        }
        if (IA_FireRight)
        {
            EIC->BindAction(IA_FireRight, ETriggerEvent::Started, this, &AVRPlayerPawn::HandleFireRight);
        }
        if (IA_ReloadLeft)
        {
            EIC->BindAction(IA_ReloadLeft, ETriggerEvent::Started, this, &AVRPlayerPawn::HandleReloadLeft);
        }
        if (IA_ReloadRight)
        {
            EIC->BindAction(IA_ReloadRight, ETriggerEvent::Started, this, &AVRPlayerPawn::HandleReloadRight);
        }
        if (IA_PauseMenu)
        {
            EIC->BindAction(IA_PauseMenu, ETriggerEvent::Started, this, &AVRPlayerPawn::HandlePausePressed);
        }
    }
}

void AVRPlayerPawn::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    if (ComfortComponent && TrackProgression)
    {
        ComfortComponent->SetTargetMovementSpeedNormalized(TrackProgression->GetNormalizedSpeedRatio());
    }
}

void AVRPlayerPawn::ResetForNewRun(ASplineTrackActor* SplineTrack)
{
    CurrentHealth = MaxHealth;
    OnHealthChanged.Broadcast(CurrentHealth, MaxHealth);

    if (TrackProgression && SplineTrack)
    {
        TrackProgression->BindSplineTrack(SplineTrack);
        TrackProgression->StartProgression();
    }

    if (LeftWeapon)
    {
        LeftWeapon->RefillMagazineInstant();
    }
    if (RightWeapon)
    {
        RightWeapon->RefillMagazineInstant();
    }
}

void AVRPlayerPawn::ApplySettings(const FPlayerVRSettings& Settings)
{
    if (ComfortComponent)
    {
        ComfortComponent->ApplyVRSettings(Settings);
    }

    // Seated mode adds ergonomic vertical offset if user is seated
    SeatedHeightOffsetZ = (Settings.PlayMode == EVRPlayMode::Seated) ? 45.0f : 0.0f;
    VROrigin->SetRelativeLocation(FVector(0.0f, 0.0f, SeatedHeightOffsetZ));

    SpawnAndAttachWeapons(Settings.Handedness);

    if (LeftWeapon)
    {
        LeftWeapon->SetAutoReloadEnabled(Settings.bAutoReloadEnabled);
    }
    if (RightWeapon)
    {
        RightWeapon->SetAutoReloadEnabled(Settings.bAutoReloadEnabled);
    }
}

void AVRPlayerPawn::CalibrateCurrentHeight()
{
    if (!ComfortComponent)
    {
        return;
    }

    FRotator Rot;
    FVector Pos;
    UHeadMountedDisplayFunctionLibrary::GetOrientationAndPosition(Rot, Pos);
    const float OffsetZ = ComfortComponent->CalibrateEyeHeight(Pos.Z);
    VROrigin->SetRelativeLocation(FVector(0.0f, 0.0f, OffsetZ + SeatedHeightOffsetZ));
}

void AVRPlayerPawn::SpawnAndAttachWeapons(EVRHandedness Handedness)
{
    if (!DefaultPistolClass || !GetWorld())
    {
        return;
    }

    auto EnsureWeapon = [this](TObjectPtr<AWeaponBase>& Slot, UMotionControllerComponent* Controller, bool bIsLeft)
    {
        if (!Slot)
        {
            FActorSpawnParameters Params;
            Params.Owner = this;
            Params.Instigator = this;
            Slot = GetWorld()->SpawnActor<AWeaponBase>(DefaultPistolClass, Params);
            if (Slot)
            {
                Slot->AttachToComponent(Controller, FAttachmentTransformRules::SnapToTargetNotIncludingScale);
                Slot->InitializeHand(this, bIsLeft);
            }
        }
    };

    const bool bNeedLeft = (Handedness == EVRHandedness::Left || Handedness == EVRHandedness::DualWield);
    const bool bNeedRight = (Handedness == EVRHandedness::Right || Handedness == EVRHandedness::DualWield);

    if (bNeedLeft)
    {
        EnsureWeapon(LeftWeapon, LeftController, true);
        LeftWeapon->SetActorHiddenInGame(false);
    }
    else if (LeftWeapon)
    {
        LeftWeapon->SetActorHiddenInGame(true);
    }

    if (bNeedRight)
    {
        EnsureWeapon(RightWeapon, RightController, false);
        RightWeapon->SetActorHiddenInGame(false);
    }
    else if (RightWeapon)
    {
        RightWeapon->SetActorHiddenInGame(true);
    }
}

void AVRPlayerPawn::HandleFireLeft(const FInputActionValue& Value)
{
    if (LeftWeapon && !LeftWeapon->IsHidden())
    {
        LeftWeapon->TryFire();
    }
}

void AVRPlayerPawn::HandleFireRight(const FInputActionValue& Value)
{
    if (RightWidgetLaser)
    {
        RightWidgetLaser->PressPointerKey(EKeys::LeftMouseButton);
        RightWidgetLaser->ReleasePointerKey(EKeys::LeftMouseButton);
    }

    if (RightWeapon && !RightWeapon->IsHidden())
    {
        RightWeapon->TryFire();
    }
}

void AVRPlayerPawn::HandleReloadLeft(const FInputActionValue& Value)
{
    if (LeftWeapon && !LeftWeapon->IsHidden())
    {
        LeftWeapon->TriggerManualReload();
    }
}

void AVRPlayerPawn::HandleReloadRight(const FInputActionValue& Value)
{
    if (RightWeapon && !RightWeapon->IsHidden())
    {
        RightWeapon->TriggerManualReload();
    }
}

void AVRPlayerPawn::HandlePausePressed(const FInputActionValue& Value)
{
    if (APulseGameMode* GM = Cast<APulseGameMode>(UGameplayStatics::GetGameMode(GetWorld())))
    {
        GM->PauseRun();
    }
}

void AVRPlayerPawn::ApplyIncomingDamage(int32 DamageAmount)
{
    const double Now = GetWorld()->GetTimeSeconds();
    if (Now - LastDamageTime < PostHitInvulnerabilitySeconds || CurrentHealth <= 0)
    {
        return;
    }

    LastDamageTime = Now;
    CurrentHealth = FMath::Max(0, CurrentHealth - DamageAmount);
    OnHealthChanged.Broadcast(CurrentHealth, MaxHealth);

    if (UScoringSubsystem* Scoring = GetWorld()->GetSubsystem<UScoringSubsystem>())
    {
        Scoring->NotifyPlayerDamaged();
    }

    if (CurrentHealth <= 0)
    {
        OnPlayerDefeated.Broadcast();
    }
}

void AVRPlayerPawn::NotifyProjectileNearMiss()
{
    const double Now = GetWorld()->GetTimeSeconds();
    if (Now - LastDodgeBonusTime < 0.35)
    {
        return;
    }
    LastDodgeBonusTime = Now;

    if (UScoringSubsystem* Scoring = GetWorld()->GetSubsystem<UScoringSubsystem>())
    {
        Scoring->NotifyPerfectDodge();
    }
    OnPerfectDodge.Broadcast();
}

void AVRPlayerPawn::PlayControllerHaptics(bool bLeftHand, UHapticFeedbackEffect_Base* HapticEffect, float Scale)
{
    if (!HapticEffect)
    {
        return;
    }

    if (APlayerController* PC = Cast<APlayerController>(GetController()))
    {
        const EControllerHand Hand = bLeftHand ? EControllerHand::Left : EControllerHand::Right;
        PC->PlayHapticEffect(HapticEffect, Hand, Scale, false);
    }
}

FVector AVRPlayerPawn::GetHeadWorldLocation() const
{
    return HMD_Camera ? HMD_Camera->GetComponentLocation() : GetActorLocation();
}
