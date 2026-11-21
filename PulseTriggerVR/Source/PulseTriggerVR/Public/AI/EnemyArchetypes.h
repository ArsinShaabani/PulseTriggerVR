#pragma once

#include "CoreMinimal.h"
#include "AI/EnemyBase.h"
#include "EnemyArchetypes.generated.h"

/** Normal Shooter: 1-hit kill, fires single beat-synced tracer projectile. */
UCLASS()
class PULSETRIGGERVR_API ANormalShooterEnemy : public AEnemyBase
{
    GENERATED_BODY()
};

/** Heavy Armored Unit: multi-HP + breakable chest armor plates. */
UCLASS()
class PULSETRIGGERVR_API AHeavyArmoredEnemy : public AEnemyBase
{
    GENERATED_BODY()

public:
    virtual void ApplyHitscanDamage(float Damage, bool bIsHeadshot, const FVector& HitPoint,
        const FVector& ShotDirection, bool& OutKilled, bool& OutArmorBroken) override;
};

/** Melee Charger: rushes directly along vector toward player spline position. */
UCLASS()
class PULSETRIGGERVR_API AMeleeChargerEnemy : public AEnemyBase
{
    GENERATED_BODY()

public:
    virtual void Tick(float DeltaTime) override;
    virtual void ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation) override;

protected:
    UPROPERTY(EditDefaultsOnly, Category = "Melee")
    float MeleeStrikeRadiusCm = 140.0f;
};

/** Elite Tactical Unit: strafes laterally and fires fan bursts on 1/8 subdivisions. */
UCLASS()
class PULSETRIGGERVR_API AEliteTacticalEnemy : public AEnemyBase
{
    GENERATED_BODY()

public:
    virtual void ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation) override;
};

UENUM(BlueprintType)
enum class EBossPhase : uint8
{
    Phase1_SuppressiveBarrage,
    Phase2_CrossfireSweeps,
    Phase3_OverdriveFinale
};

/** Multi-Phase Boss Encounter Unit transitioning attack patterns at HP thresholds. */
UCLASS()
class PULSETRIGGERVR_API ABossEncounterUnit : public AEnemyBase
{
    GENERATED_BODY()

public:
    virtual void InitializeFromArchetype(UEnemyArchetypeDataAsset* InArchetype, int32 InFireBeatDelay) override;
    virtual void ApplyHitscanDamage(float Damage, bool bIsHeadshot, const FVector& HitPoint,
        const FVector& ShotDirection, bool& OutKilled, bool& OutArmorBroken) override;
    virtual void ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation) override;

    UFUNCTION(BlueprintPure, Category = "Boss")
    EBossPhase GetCurrentBossPhase() const { return CurrentPhase; }

private:
    void EvaluatePhaseTransition();
    EBossPhase CurrentPhase = EBossPhase::Phase1_SuppressiveBarrage;
    int32 SweepStepIndex = 0;
};
