#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Core/PulseTypes.h"
#include "Core/IPoolableActor.h"
#include "EnemyBase.generated.h"

class UEnemyArchetypeDataAsset;
class USphereComponent;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEnemyStateChanged, EEnemyState, OldState, EEnemyState, NewState);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnEnemyKilled, AEnemyBase*, KilledEnemy);

/**
 * Modular pooled enemy base character supporting State Machine, Behavior Tree + EQS,
 * armor absorption, headshot hitbox, and beat-synchronized firing.
 */
UCLASS()
class PULSETRIGGERVR_API AEnemyBase : public ACharacter, public IPoolableActor
{
    GENERATED_BODY()

public:
    AEnemyBase();

    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;

    UFUNCTION(BlueprintCallable, Category = "Enemy")
    virtual void InitializeFromArchetype(UEnemyArchetypeDataAsset* InArchetype, int32 InFireBeatDelay);

    UFUNCTION(BlueprintCallable, Category = "Enemy|Combat")
    virtual void ApplyHitscanDamage(float Damage, bool bIsHeadshot, const FVector& HitPoint,
        const FVector& ShotDirection, bool& OutKilled, bool& OutArmorBroken);

    UFUNCTION(BlueprintCallable, Category = "Enemy|Combat")
    virtual void ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation);

    UFUNCTION(BlueprintCallable, Category = "Enemy|State")
    void TransitionState(EEnemyState NewState);

    UFUNCTION(BlueprintPure, Category = "Enemy|State")
    EEnemyState GetEnemyState() const { return CurrentState; }

    UFUNCTION(BlueprintPure, Category = "Enemy")
    UEnemyArchetypeDataAsset* GetArchetypeData() const { return ArchetypeData; }

    virtual void OnAcquiredFromPool_Implementation() override;
    virtual void OnReturnedToPool_Implementation() override;
    virtual bool IsCurrentlyPooled_Implementation() const override { return bIsPooled; }

    UPROPERTY(BlueprintAssignable, Category = "Enemy")
    FOnEnemyStateChanged OnStateChanged;

    UPROPERTY(BlueprintAssignable, Category = "Enemy")
    FOnEnemyKilled OnEnemyKilled;

protected:
    virtual void HandleDeathSequence(const FVector& ShotDirection);
    void SpawnPooledProjectile(const FVector& Origin, const FVector& Direction);

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Enemy|Combat")
    TObjectPtr<USphereComponent> HeadHitboxSphere = nullptr;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Enemy|Combat")
    TObjectPtr<USceneComponent> MuzzleSocket = nullptr;

    /** World-space jagged score popup (e.g., 368 / 584) triggered on kill. */
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Enemy|UI")
    TObjectPtr<class UWidgetComponent> KillScorePopupWidget = nullptr;

    UFUNCTION(BlueprintImplementableEvent, Category = "Enemy|VFX")
    void OnPlayShatterDeathVFX(const FVector& ShotDirection, int32 PointsAwarded, bool bWasOnBeat);

    UPROPERTY(Transient)
    TObjectPtr<UEnemyArchetypeDataAsset> ArchetypeData = nullptr;

    UPROPERTY(VisibleInstanceOnly, BlueprintReadOnly, Category = "Enemy|State")
    EEnemyState CurrentState = EEnemyState::Pooled;

    float CurrentHealth = 100.0f;
    float CurrentArmor = 0.0f;
    int32 BeatCounter = 0;
    int32 FireBeatDelayRemaining = 2;
    bool bIsPooled = true;
    float DeathReturnTimer = 0.0f;

private:
    UFUNCTION()
    void OnBeatTick(const FBeatEventPayload& Payload);
};
