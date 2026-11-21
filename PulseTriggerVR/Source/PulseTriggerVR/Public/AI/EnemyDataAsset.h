#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Core/PulseTypes.h"
#include "EnemyDataAsset.generated.h"

class UBehaviorTree;
class UEnvQuery;
class USoundBase;
class UNiagaraSystem;
class AEnemyProjectilePoolItem;
class AEnemyBase;

/**
 * Data-driven enemy definition (zero hardcoded enemy stats in C++).
 */
UCLASS(BlueprintType)
class PULSETRIGGERVR_API UEnemyArchetypeDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Identity")
    FName ArchetypeId = TEXT("NormalShooter");

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Identity")
    EEnemyArchetype ArchetypeType = EEnemyArchetype::NormalShooter;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Identity")
    TSubclassOf<AEnemyBase> EnemyActorClass;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float MaxHealth = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float MaxArmor = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    float MoveSpeedCmPerSec = 420.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Combat")
    int32 BaseKillScore = 100;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Attack")
    EBeatSubdivision FireSubdivision = EBeatSubdivision::Quarter;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Attack")
    int32 BeatsBetweenShots = 4;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Attack")
    int32 BurstProjectileCount = 1;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Attack")
    float BurstSpreadAngleDeg = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Attack")
    float ProjectileSpeedCmPerSec = 1400.0f;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Attack")
    TSubclassOf<AEnemyProjectilePoolItem> ProjectilePoolClass;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "AI")
    TObjectPtr<UBehaviorTree> BehaviorTreeAsset = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "AI")
    TObjectPtr<UEnvQuery> TacticalPositionEQS = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Audio")
    TObjectPtr<USoundBase> SpawnVoiceCue = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Audio")
    TObjectPtr<USoundBase> FireAudioCue = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Audio")
    TObjectPtr<USoundBase> DeathAudioCue = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "VFX")
    TObjectPtr<UNiagaraSystem> DeathDissolveVFX = nullptr;
};
