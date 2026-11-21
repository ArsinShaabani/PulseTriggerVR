#include "AI/EnemyArchetypes.h"
#include "AI/EnemyDataAsset.h"
#include "VR/VRPlayerPawn.h"
#include "Kismet/GameplayStatics.h"

void AHeavyArmoredEnemy::ApplyHitscanDamage(float Damage, bool bIsHeadshot, const FVector& HitPoint,
    const FVector& ShotDirection, bool& OutKilled, bool& OutArmorBroken)
{
    // Headshots bypass 50% of heavy frontal armor
    const float EffectiveDamage = bIsHeadshot ? Damage * 1.25f : Damage * 0.85f;
    Super::ApplyHitscanDamage(EffectiveDamage, bIsHeadshot, HitPoint, ShotDirection, OutKilled, OutArmorBroken);
}

void AMeleeChargerEnemy::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    if (bIsPooled || CurrentState == EEnemyState::Dead || !ArchetypeData)
    {
        return;
    }

    if (AVRPlayerPawn* PlayerPawn = Cast<AVRPlayerPawn>(UGameplayStatics::GetPlayerPawn(GetWorld(), 0)))
    {
        const FVector ToPlayer = PlayerPawn->GetActorLocation() - GetActorLocation();
        const float Dist = ToPlayer.Size();
        if (Dist > MeleeStrikeRadiusCm)
        {
            const FVector Dir = ToPlayer.GetSafeNormal2D();
            AddActorWorldOffset(Dir * ArchetypeData->MoveSpeedCmPerSec * DeltaTime, true);
            SetActorRotation(Dir.Rotation());
        }
        else
        {
            PlayerPawn->ApplyIncomingDamage(1);
            HandleDeathSequence(-ToPlayer.GetSafeNormal());
        }
    }
}

void AMeleeChargerEnemy::ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation)
{
    // Melee chargers lunge rather than firing ranged projectiles
    if (CurrentState != EEnemyState::Dead && ArchetypeData)
    {
        const FVector LungeDir = (TargetPlayerHeadLocation - GetActorLocation()).GetSafeNormal2D();
        AddActorWorldOffset(LungeDir * 110.0f, true);
    }
}

void AEliteTacticalEnemy::ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation)
{
    if (CurrentState == EEnemyState::Dead || !ArchetypeData)
    {
        return;
    }

    // Lateral strafe step before firing fan spread
    const FVector RightDir = GetActorRightVector();
    const float StrafeSign = (BeatCounter % 2 == 0) ? 1.0f : -1.0f;
    AddActorWorldOffset(RightDir * StrafeSign * 85.0f, true);
    Super::ExecuteBeatAttack(TargetPlayerHeadLocation);
}

void ABossEncounterUnit::InitializeFromArchetype(UEnemyArchetypeDataAsset* InArchetype, int32 InFireBeatDelay)
{
    Super::InitializeFromArchetype(InArchetype, InFireBeatDelay);
    CurrentPhase = EBossPhase::Phase1_SuppressiveBarrage;
    SweepStepIndex = 0;
}

void ABossEncounterUnit::ApplyHitscanDamage(float Damage, bool bIsHeadshot, const FVector& HitPoint,
    const FVector& ShotDirection, bool& OutKilled, bool& OutArmorBroken)
{
    Super::ApplyHitscanDamage(Damage, bIsHeadshot, HitPoint, ShotDirection, OutKilled, OutArmorBroken);
    if (!OutKilled)
    {
        EvaluatePhaseTransition();
    }
}

void ABossEncounterUnit::EvaluatePhaseTransition()
{
    if (!ArchetypeData || ArchetypeData->MaxHealth <= 0.0f)
    {
        return;
    }

    const float HealthRatio = CurrentHealth / ArchetypeData->MaxHealth;
    if (HealthRatio <= 0.33f)
    {
        CurrentPhase = EBossPhase::Phase3_OverdriveFinale;
    }
    else if (HealthRatio <= 0.66f)
    {
        CurrentPhase = EBossPhase::Phase2_CrossfireSweeps;
    }
}

void ABossEncounterUnit::ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation)
{
    if (!ArchetypeData || CurrentState == EEnemyState::Dead)
    {
        return;
    }

    const FVector MuzzleLoc = MuzzleSocket ? MuzzleSocket->GetComponentLocation() : GetActorLocation() + FVector(0.0f, 0.0f, 180.0f);
    const FVector AimDir = (TargetPlayerHeadLocation - MuzzleLoc).GetSafeNormal();
    ++SweepStepIndex;

    switch (CurrentPhase)
    {
    case EBossPhase::Phase1_SuppressiveBarrage:
        Super::ExecuteBeatAttack(TargetPlayerHeadLocation);
        break;

    case EBossPhase::Phase2_CrossfireSweeps:
    {
        const float SweepYaw = FMath::Sin(static_cast<float>(SweepStepIndex) * 0.65f) * 18.0f;
        SpawnPooledProjectile(MuzzleLoc, AimDir.RotateAngleAxis(SweepYaw, FVector::UpVector));
        SpawnPooledProjectile(MuzzleLoc, AimDir.RotateAngleAxis(-SweepYaw, FVector::UpVector));
        break;
    }

    case EBossPhase::Phase3_OverdriveFinale:
    {
        for (int32 i = -2; i <= 2; ++i)
        {
            const float Angle = static_cast<float>(i) * 7.5f;
            SpawnPooledProjectile(MuzzleLoc, AimDir.RotateAngleAxis(Angle, FVector::UpVector));
        }
        break;
    }
    }
}
