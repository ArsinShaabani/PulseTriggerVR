#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "Core/PulseTypes.h"
#include "InputActionValue.h"
#include "VRPlayerPawn.generated.h"

class UCameraComponent;
class UMotionControllerComponent;
class USphereComponent;
class UCapsuleComponent;
class UWidgetInteractionComponent;
class UTrackProgressionComponent;
class UVRComfortComponent;
class AWeaponBase;
class ASplineTrackActor;
class UInputMappingContext;
class UInputAction;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnPlayerHealthChanged, int32, CurrentHP, int32, MaxHP);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnPlayerDefeated);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnPerfectDodgeTriggered);

/**
 * OpenXR VR Player Pawn mounted onto the spline rail.
 * Tracks physical head position for bullet dodging & near-miss Perfect Dodge bonuses,
 * drives dual MotionControllers, Enhanced Input, haptics, and VR UI interaction.
 */
UCLASS()
class PULSETRIGGERVR_API AVRPlayerPawn : public APawn
{
    GENERATED_BODY()

public:
    AVRPlayerPawn();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

    UFUNCTION(BlueprintCallable, Category = "VR|Lifecycle")
    void ResetForNewRun(ASplineTrackActor* SplineTrack);

    UFUNCTION(BlueprintCallable, Category = "VR|Calibration")
    void ApplySettings(const FPlayerVRSettings& Settings);

    UFUNCTION(BlueprintCallable, Category = "VR|Calibration")
    void CalibrateCurrentHeight();

    UFUNCTION(BlueprintCallable, Category = "Combat")
    void ApplyIncomingDamage(int32 DamageAmount);

    UFUNCTION(BlueprintCallable, Category = "Combat")
    void NotifyProjectileNearMiss();

    UFUNCTION(BlueprintCallable, Category = "VR|Haptics")
    void PlayControllerHaptics(bool bLeftHand, UHapticFeedbackEffect_Base* HapticEffect, float Scale = 1.0f);

    UFUNCTION(BlueprintPure, Category = "VR|Combat")
    FVector GetHeadWorldLocation() const;

    UFUNCTION(BlueprintPure, Category = "VR|Combat")
    int32 GetCurrentHealth() const { return CurrentHealth; }

    UPROPERTY(BlueprintAssignable, Category = "Combat")
    FOnPlayerHealthChanged OnHealthChanged;

    UPROPERTY(BlueprintAssignable, Category = "Combat")
    FOnPlayerDefeated OnPlayerDefeated;

    UPROPERTY(BlueprintAssignable, Category = "Combat")
    FOnPerfectDodgeTriggered OnPerfectDodge;

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|Components")
    TObjectPtr<USceneComponent> VROrigin = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|Components")
    TObjectPtr<UCameraComponent> HMD_Camera = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|Components")
    TObjectPtr<USphereComponent> HeadHitbox = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|Components")
    TObjectPtr<USphereComponent> NearMissDodgeSphere = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|Components")
    TObjectPtr<UMotionControllerComponent> LeftController = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|Components")
    TObjectPtr<UMotionControllerComponent> RightController = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|UI")
    TObjectPtr<UWidgetInteractionComponent> RightWidgetLaser = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|UI")
    TObjectPtr<UWidgetInteractionComponent> GazeFallbackPointer = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Movement")
    TObjectPtr<UTrackProgressionComponent> TrackProgression = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "VR|Comfort")
    TObjectPtr<UVRComfortComponent> ComfortComponent = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "Weapons")
    TSubclassOf<AWeaponBase> DefaultPistolClass;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Input")
    TObjectPtr<UInputMappingContext> VRGameplayMappingContext = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Input")
    TObjectPtr<UInputAction> IA_FireLeft = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Input")
    TObjectPtr<UInputAction> IA_FireRight = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Input")
    TObjectPtr<UInputAction> IA_ReloadLeft = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Input")
    TObjectPtr<UInputAction> IA_ReloadRight = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "VR|Input")
    TObjectPtr<UInputAction> IA_PauseMenu = nullptr;

    UPROPERTY(EditDefaultsOnly, Category = "Combat")
    int32 MaxHealth = 4;

    UPROPERTY(EditDefaultsOnly, Category = "Combat")
    float PostHitInvulnerabilitySeconds = 0.65f;

private:
    void SpawnAndAttachWeapons(EVRHandedness Handedness);
    void HandleFireLeft(const FInputActionValue& Value);
    void HandleFireRight(const FInputActionValue& Value);
    void HandleReloadLeft(const FInputActionValue& Value);
    void HandleReloadRight(const FInputActionValue& Value);
    void HandlePausePressed(const FInputActionValue& Value);

    UPROPERTY(Transient)
    TObjectPtr<AWeaponBase> LeftWeapon = nullptr;

    UPROPERTY(Transient)
    TObjectPtr<AWeaponBase> RightWeapon = nullptr;

    int32 CurrentHealth = 4;
    double LastDamageTime = -10.0;
    double LastDodgeBonusTime = -10.0;
    float SeatedHeightOffsetZ = 0.0f;
    bool bIsHandTrackingActive = false;
};
