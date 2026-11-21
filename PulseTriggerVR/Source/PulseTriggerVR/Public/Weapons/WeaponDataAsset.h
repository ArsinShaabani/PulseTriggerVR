#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "WeaponDataAsset.generated.h"

class USoundBase;
class UNiagaraSystem;
class UHapticFeedbackEffect_Base;
class ABulletTracerPoolItem;

/**
 * Data-driven weapon tuning allowing designers to add new weapons without modifying C++.
 */
UCLASS(BlueprintType)
class PULSETRIGGERVR_API UWeaponDataAsset : public UDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Identity")
    FName WeaponId = TEXT("SemiAutoPistol");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Identity")
    FText DisplayName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    int32 MagazineCapacity = 15;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float BaseDamage = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float HeadshotMultiplier = 2.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float MaxRangeCm = 12000.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float FireCooldownSec = 0.11f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float ReloadDurationSec = 0.45f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float TiltReloadDownDotThreshold = -0.65f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Feel")
    float RecoilKickAngleDeg = 9.5f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Feel")
    float RecoilRecoverySpeed = 18.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Feel")
    float HitscanMagnetismRadiusCm = 14.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "FX")
    TSubclassOf<ABulletTracerPoolItem> TracerPoolClass;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "FX")
    TObjectPtr<UNiagaraSystem> MuzzleFlashVFX = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "FX")
    TObjectPtr<UNiagaraSystem> ImpactVFX = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Audio")
    TObjectPtr<USoundBase> FireSound = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Audio")
    TObjectPtr<USoundBase> DryFireSound = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Audio")
    TObjectPtr<USoundBase> ReloadSound = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Haptics")
    TObjectPtr<UHapticFeedbackEffect_Base> FireHaptic = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Haptics")
    TObjectPtr<UHapticFeedbackEffect_Base> ReloadHaptic = nullptr;
};
