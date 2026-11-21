#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/PulseTypes.h"
#include "WeaponBase.generated.h"

class UWeaponDataAsset;
class USkeletalMeshComponent;
class UNiagaraComponent;
class AVRPlayerPawn;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnWeaponFired, const FShotResult&, Result);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnAmmoUpdated, int32, CurrentAmmo, int32, MaxAmmo);

/**
 * Abstract base VR hitscan weapon with recoil spring, pooled VFX,
 * OpenXR haptics, manual gesture/button reload, and optional auto-reload.
 */
UCLASS(Abstract)
class PULSETRIGGERVR_API AWeaponBase : public AActor
{
    GENERATED_BODY()

public:
    AWeaponBase();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void InitializeHand(AVRPlayerPawn* InOwnerPawn, bool bInIsLeftHand);

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    virtual bool TryFire();

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    virtual void TriggerManualReload();

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void RefillMagazineInstant();

    UFUNCTION(BlueprintCallable, Category = "Weapon")
    void SetAutoReloadEnabled(bool bEnabled) { bAutoReload = bEnabled; }

    UFUNCTION(BlueprintPure, Category = "Weapon")
    int32 GetCurrentAmmo() const { return CurrentAmmo; }

    UPROPERTY(BlueprintAssignable, Category = "Weapon")
    FOnWeaponFired OnWeaponFired;

    UPROPERTY(BlueprintAssignable, Category = "Weapon")
    FOnAmmoUpdated OnAmmoUpdated;

protected:
    virtual void ExecuteHitscanShot();
    void CheckTiltReloadGesture();
    void CompleteReload();

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Weapon")
    TObjectPtr<USceneComponent> WeaponRoot = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Weapon")
    TObjectPtr<USkeletalMeshComponent> WeaponMesh = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Weapon")
    TObjectPtr<USceneComponent> MuzzlePoint = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Weapon")
    TObjectPtr<UNiagaraComponent> MuzzleFlashComp = nullptr;

    /** Diegetic ammo counter mounted directly on the backstrap of the pistol mesh. */
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Weapon|DiegeticUI")
    TObjectPtr<class UWidgetComponent> BackstrapAmmoWidget = nullptr;

    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Weapon")
    TObjectPtr<UWeaponDataAsset> WeaponData = nullptr;

    UPROPERTY(Transient)
    TObjectPtr<AVRPlayerPawn> OwnerPawn = nullptr;

    int32 CurrentAmmo = 15;
    bool bIsLeftHand = false;
    bool bAutoReload = false;
    bool bIsReloading = false;
    double LastFireTime = -10.0;
    float CurrentRecoilPitch = 0.0f;
    FTimerHandle ReloadTimerHandle;
};
