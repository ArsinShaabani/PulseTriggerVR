#include "AI/EnemyBase.h"
#include "AI/EnemyDataAsset.h"
#include "AI/EnemyAIController.h"
#include "AI/EnemyProjectilePoolItem.h"
#include "Core/ObjectPoolSubsystem.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "Systems/PulseAudioSubsystem.h"
#include "Components/SphereComponent.h"
#include "Components/CapsuleComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "NiagaraFunctionLibrary.h"
#include "Kismet/GameplayStatics.h"
#include "PulseTriggerVR.h"

AEnemyBase::AEnemyBase()
{
    PrimaryActorTick.bCanEverTick = true;
    AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;
    AIControllerClass = AEnemyAIController::StaticClass();

    HeadHitboxSphere = CreateDefaultSubobject<USphereComponent>(TEXT("HeadHitboxSphere"));
    HeadHitboxSphere->SetupAttachment(GetMesh(), FName("head"));
    HeadHitboxSphere->SetSphereRadius(18.0f);
    HeadHitboxSphere->ComponentTags.Add(TEXT("HeadHitbox"));

    MuzzleSocket = CreateDefaultSubobject<USceneComponent>(TEXT("MuzzleSocket"));
    MuzzleSocket->SetupAttachment(GetMesh());
    MuzzleSocket->SetRelativeLocation(FVector(45.0f, 0.0f, 130.0f));

    if (UCharacterMovementComponent* MoveComp = GetCharacterMovement())
    {
        MoveComp->bUseRVOAvoidance = false;
        MoveComp->MaxWalkSpeed = 420.0f;
    }
}

void AEnemyBase::BeginPlay()
{
    Super::BeginPlay();

    if (UBeatManagerSubsystem* BeatMgr = GetWorld()->GetSubsystem<UBeatManagerSubsystem>())
    {
        BeatMgr->OnQuarterBeat.AddDynamic(this, &AEnemyBase::OnBeatTick);
    }
}

void AEnemyBase::InitializeFromArchetype(UEnemyArchetypeDataAsset* InArchetype, int32 InFireBeatDelay)
{
    ArchetypeData = InArchetype;
    FireBeatDelayRemaining = FMath::Max(1, InFireBeatDelay);
    BeatCounter = 0;

    if (ArchetypeData)
    {
        CurrentHealth = ArchetypeData->MaxHealth;
        CurrentArmor = ArchetypeData->MaxArmor;
        if (UCharacterMovementComponent* MoveComp = GetCharacterMovement())
        {
            MoveComp->MaxWalkSpeed = ArchetypeData->MoveSpeedCmPerSec;
        }
        if (AEnemyAIController* AICon = Cast<AEnemyAIController>(GetController()))
        {
            AICon->StartEnemyBehavior(ArchetypeData);
        }
        if (ArchetypeData->SpawnVoiceCue)
        {
            if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
            {
                Audio->PlaySpatialSFX(ArchetypeData->SpawnVoiceCue, GetActorLocation());
            }
        }
    }

    TransitionState(EEnemyState::Repositioning);
}

void AEnemyBase::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    if (CurrentState == EEnemyState::Dead)
    {
        DeathReturnTimer -= DeltaTime;
        if (DeathReturnTimer <= 0.0f)
        {
            if (UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>())
            {
                PoolSys->ReturnActor(this);
            }
        }
    }
}

void AEnemyBase::OnBeatTick(const FBeatEventPayload& Payload)
{
    if (bIsPooled || CurrentState == EEnemyState::Dead || !ArchetypeData)
    {
        return;
    }

    if (FireBeatDelayRemaining > 0)
    {
        --FireBeatDelayRemaining;
        if (FireBeatDelayRemaining == 1)
        {
            TransitionState(EEnemyState::Telegraphing);
        }
        return;
    }

    ++BeatCounter;
    if (BeatCounter >= ArchetypeData->BeatsBetweenShots)
    {
        BeatCounter = 0;
        if (APawn* PlayerPawn = UGameplayStatics::GetPlayerPawn(GetWorld(), 0))
        {
            ExecuteBeatAttack(PlayerPawn->GetActorLocation() + FVector(0.0f, 0.0f, 155.0f));
        }
    }
    else if (BeatCounter == ArchetypeData->BeatsBetweenShots - 1)
    {
        TransitionState(EEnemyState::Telegraphing);
    }
}

void AEnemyBase::ApplyHitscanDamage(float Damage, bool bIsHeadshot, const FVector& HitPoint,
    const FVector& ShotDirection, bool& OutKilled, bool& OutArmorBroken)
{
    OutKilled = false;
    OutArmorBroken = false;

    if (CurrentState == EEnemyState::Dead || bIsPooled)
    {
        return;
    }

    float RemainingDamage = Damage;
    if (CurrentArmor > 0.0f)
    {
        const float Absorbed = FMath::Min(CurrentArmor, RemainingDamage);
        CurrentArmor -= Absorbed;
        RemainingDamage -= Absorbed;
        if (CurrentArmor <= 0.0f)
        {
            OutArmorBroken = true;
            TransitionState(EEnemyState::Staggered);
        }
    }

    if (RemainingDamage > 0.0f)
    {
        CurrentHealth -= RemainingDamage;
    }

    if (CurrentHealth <= 0.0f)
    {
        OutKilled = true;
        HandleDeathSequence(ShotDirection);
    }
}

void AEnemyBase::ExecuteBeatAttack(const FVector& TargetPlayerHeadLocation)
{
    if (!ArchetypeData || CurrentState == EEnemyState::Dead)
    {
        return;
    }

    TransitionState(EEnemyState::Attacking);

    const FVector MuzzleLoc = MuzzleSocket ? MuzzleSocket->GetComponentLocation() : GetActorLocation() + FVector(0.0f, 0.0f, 130.0f);
    const FVector BaseDir = (TargetPlayerHeadLocation - MuzzleLoc).GetSafeNormal();
    const int32 Count = FMath::Max(1, ArchetypeData->BurstProjectileCount);

    for (int32 Index = 0; Index < Count; ++Index)
    {
        float YawOffset = 0.0f;
        if (Count > 1)
        {
            const float Alpha = static_cast<float>(Index) / static_cast<float>(Count - 1) - 0.5f;
            YawOffset = Alpha * ArchetypeData->BurstSpreadAngleDeg;
        }
        const FVector SpreadDir = BaseDir.RotateAngleAxis(YawOffset, FVector::UpVector);
        SpawnPooledProjectile(MuzzleLoc, SpreadDir);
    }

    if (ArchetypeData->FireAudioCue)
    {
        if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
        {
            Audio->PlaySpatialSFX(ArchetypeData->FireAudioCue, MuzzleLoc);
        }
    }
}

void AEnemyBase::SpawnPooledProjectile(const FVector& Origin, const FVector& Direction)
{
    if (!ArchetypeData || !ArchetypeData->ProjectilePoolClass)
    {
        return;
    }

    if (UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>())
    {
        if (AEnemyProjectilePoolItem* Proj = Cast<AEnemyProjectilePoolItem>(
            PoolSys->AcquireActor(ArchetypeData->ProjectilePoolClass, FTransform(Direction.Rotation(), Origin))))
        {
            Proj->LaunchProjectile(Origin, Direction * ArchetypeData->ProjectileSpeedCmPerSec, 1, 4.5f);
        }
    }
}

void AEnemyBase::HandleDeathSequence(const FVector& ShotDirection)
{
    TransitionState(EEnemyState::Dead);
    GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    DeathReturnTimer = 0.45f;

    if (ArchetypeData)
    {
        if (ArchetypeData->DeathDissolveVFX)
        {
            UNiagaraFunctionLibrary::SpawnSystemAtLocation(GetWorld(), ArchetypeData->DeathDissolveVFX, GetActorLocation());
        }
        if (ArchetypeData->DeathAudioCue)
        {
            if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
            {
                Audio->PlaySpatialSFX(ArchetypeData->DeathAudioCue, GetActorLocation());
            }
        }
    }

    OnEnemyKilled.Broadcast(this);
}

void AEnemyBase::TransitionState(EEnemyState NewState)
{
    if (CurrentState == NewState)
    {
        return;
    }
    const EEnemyState OldState = CurrentState;
    CurrentState = NewState;
    OnStateChanged.Broadcast(OldState, NewState);
}

void AEnemyBase::OnAcquiredFromPool_Implementation()
{
    bIsPooled = false;
    GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
    TransitionState(EEnemyState::Spawning);
}

void AEnemyBase::OnReturnedToPool_Implementation()
{
    bIsPooled = true;
    TransitionState(EEnemyState::Pooled);
}
