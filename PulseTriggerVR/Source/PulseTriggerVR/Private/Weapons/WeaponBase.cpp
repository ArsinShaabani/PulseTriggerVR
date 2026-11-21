#include "Weapons/WeaponBase.h"
#include "Weapons/WeaponDataAsset.h"
#include "Weapons/BulletTracerPoolItem.h"
#include "VR/VRPlayerPawn.h"
#include "AI/EnemyBase.h"
#include "Core/ObjectPoolSubsystem.h"
#include "Rhythm/BeatManagerSubsystem.h"
#include "Systems/ScoringSubsystem.h"
#include "Systems/PulseAudioSubsystem.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/WidgetComponent.h"
#include "NiagaraComponent.h"
#include "NiagaraFunctionLibrary.h"
#include "TimerManager.h"
#include "Engine/World.h"
#include "PulseTriggerVR.h"

AWeaponBase::AWeaponBase()
{
    PrimaryActorTick.bCanEverTick = true;

    WeaponRoot = CreateDefaultSubobject<USceneComponent>(TEXT("WeaponRoot"));
    RootComponent = WeaponRoot;

    WeaponMesh = CreateDefaultSubobject<USkeletalMeshComponent>(TEXT("WeaponMesh"));
    WeaponMesh->SetupAttachment(WeaponRoot);
    WeaponMesh->SetCastShadow(false);

    MuzzlePoint = CreateDefaultSubobject<USceneComponent>(TEXT("MuzzlePoint"));
    MuzzlePoint->SetupAttachment(WeaponMesh);

    MuzzleFlashComp = CreateDefaultSubobject<UNiagaraComponent>(TEXT("MuzzleFlashComp"));
    MuzzleFlashComp->SetupAttachment(MuzzlePoint);
    MuzzleFlashComp->bAutoActivate = false;

    BackstrapAmmoWidget = CreateDefaultSubobject<UWidgetComponent>(TEXT("BackstrapAmmoWidget"));
    BackstrapAmmoWidget->SetupAttachment(WeaponMesh);
    BackstrapAmmoWidget->SetWidgetSpace(EWidgetSpace::World);
    BackstrapAmmoWidget->SetDrawSize(FVector2D(128.0f, 128.0f));
    BackstrapAmmoWidget->SetRelativeLocation(FVector(-12.0f, 0.0f, 6.5f));
    BackstrapAmmoWidget->SetRelativeScale3D(FVector(0.06f));
    BackstrapAmmoWidget->SetCastShadow(false);
}

void AWeaponBase::BeginPlay()
{
    Super::BeginPlay();
    if (WeaponData)
    {
        CurrentAmmo = WeaponData->MagazineCapacity;
        if (WeaponData->MuzzleFlashVFX)
        {
            MuzzleFlashComp->SetAsset(WeaponData->MuzzleFlashVFX);
        }
    }
}

void AWeaponBase::InitializeHand(AVRPlayerPawn* InOwnerPawn, bool bInIsLeftHand)
{
    OwnerPawn = InOwnerPawn;
    bIsLeftHand = bInIsLeftHand;
}

void AWeaponBase::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    const float RecoverySpeed = WeaponData ? WeaponData->RecoilRecoverySpeed : 18.0f;
    CurrentRecoilPitch = FMath::FInterpTo(CurrentRecoilPitch, 0.0f, DeltaTime, RecoverySpeed);
    WeaponMesh->SetRelativeRotation(FRotator(CurrentRecoilPitch, 0.0f, 0.0f));

    if (!bIsReloading && CurrentAmmo <= 0)
    {
        if (bAutoReload)
        {
            TriggerManualReload();
        }
        else
        {
            CheckTiltReloadGesture();
        }
    }
    else if (!bIsReloading && WeaponData && CurrentAmmo < WeaponData->MagazineCapacity)
    {
        CheckTiltReloadGesture();
    }
}

void AWeaponBase::CheckTiltReloadGesture()
{
    if (!WeaponData)
    {
        return;
    }

    // Pistol Whip style flick/aim-downward reload gesture
    const float ForwardZ = MuzzlePoint->GetForwardVector().Z;
    if (ForwardZ <= WeaponData->TiltReloadDownDotThreshold)
    {
        TriggerManualReload();
    }
}

bool AWeaponBase::TryFire()
{
    if (!WeaponData || bIsReloading)
    {
        return false;
    }

    const double Now = GetWorld()->GetTimeSeconds();
    if (Now - LastFireTime < WeaponData->FireCooldownSec)
    {
        return false;
    }

    if (CurrentAmmo <= 0)
    {
        if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
        {
            Audio->PlaySpatialSFX(WeaponData->DryFireSound, MuzzlePoint->GetComponentLocation());
        }
        if (bAutoReload)
        {
            TriggerManualReload();
        }
        return false;
    }

    LastFireTime = Now;
    --CurrentAmmo;
    OnAmmoUpdated.Broadcast(CurrentAmmo, WeaponData->MagazineCapacity);

    ExecuteHitscanShot();

    CurrentRecoilPitch = FMath::Min(CurrentRecoilPitch + WeaponData->RecoilKickAngleDeg, 22.0f);
    MuzzleFlashComp->Activate(true);

    if (OwnerPawn && WeaponData->FireHaptic)
    {
        OwnerPawn->PlayControllerHaptics(bIsLeftHand, WeaponData->FireHaptic, 1.0f);
    }

    if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
    {
        Audio->PlaySpatialSFX(WeaponData->FireSound, MuzzlePoint->GetComponentLocation());
    }

    if (CurrentAmmo == 0 && bAutoReload)
    {
        TriggerManualReload();
    }

    return true;
}

void AWeaponBase::ExecuteHitscanShot()
{
    UWorld* World = GetWorld();
    if (!World || !WeaponData)
    {
        return;
    }

    const FVector Start = MuzzlePoint->GetComponentLocation();
    const FVector Forward = MuzzlePoint->GetForwardVector();
    const FVector End = Start + (Forward * WeaponData->MaxRangeCm);

    FHitResult Hit;
    FCollisionQueryParams QueryParams;
    QueryParams.AddIgnoredActor(this);
    QueryParams.AddIgnoredActor(OwnerPawn);

    bool bDidHit = World->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, QueryParams);
    if (!bDidHit && WeaponData->HitscanMagnetismRadiusCm > 0.0f)
    {
        // Subtle VR aim-magnetism sweep for satisfying action-movie gunplay at 90Hz
        bDidHit = World->SweepSingleByChannel(
            Hit, Start, End, FQuat::Identity, ECC_Pawn,
            FCollisionShape::MakeSphere(WeaponData->HitscanMagnetismRadiusCm), QueryParams);
    }

    FShotResult Result;
    Result.bHit = bDidHit;
    Result.ImpactLocation = bDidHit ? Hit.ImpactPoint : End;

    if (UBeatManagerSubsystem* BeatMgr = World->GetSubsystem<UBeatManagerSubsystem>())
    {
        Result.BeatRank = BeatMgr->EvaluateBeatAccuracy(Result.BeatErrorMs);
    }

    if (bDidHit)
    {
        if (AEnemyBase* HitEnemy = Cast<AEnemyBase>(Hit.GetActor()))
        {
            const bool bIsHeadshot = Hit.BoneName == FName("head") || (Hit.Component.IsValid() && Hit.Component->ComponentHasTag(TEXT("HeadHitbox")));
            Result.bHeadshot = bIsHeadshot;
            const float Damage = WeaponData->BaseDamage * (bIsHeadshot ? WeaponData->HeadshotMultiplier : 1.0f);
            HitEnemy->ApplyHitscanDamage(Damage, bIsHeadshot, Hit.ImpactPoint, Forward, Result.bKill, Result.bArmorBroken);
        }

        if (WeaponData->ImpactVFX)
        {
            UNiagaraFunctionLibrary::SpawnSystemAtLocation(World, WeaponData->ImpactVFX, Hit.ImpactPoint, Hit.ImpactNormal.Rotation());
        }
    }

    if (UScoringSubsystem* Scoring = World->GetSubsystem<UScoringSubsystem>())
    {
        Result.PointsAwarded = Scoring->RecordPlayerShot(Result);
    }

    if (WeaponData->TracerPoolClass)
    {
        if (UObjectPoolSubsystem* PoolSys = World->GetSubsystem<UObjectPoolSubsystem>())
        {
            if (ABulletTracerPoolItem* Tracer = Cast<ABulletTracerPoolItem>(PoolSys->AcquireActor(WeaponData->TracerPoolClass, FTransform(Start))))
            {
                const FLinearColor Color = (Result.BeatRank == EBeatAccuracyRank::Perfect)
                    ? FLinearColor(1.0f, 0.32f, 0.72f)
                    : FLinearColor(1.0f, 0.75f, 0.22f);
                Tracer->ConfigureBeam(Start, Result.ImpactLocation, Color);
            }
        }
    }

    OnWeaponFired.Broadcast(Result);
}

void AWeaponBase::TriggerManualReload()
{
    if (!WeaponData || bIsReloading || CurrentAmmo >= WeaponData->MagazineCapacity)
    {
        return;
    }

    bIsReloading = true;
    if (UPulseAudioSubsystem* Audio = GetGameInstance()->GetSubsystem<UPulseAudioSubsystem>())
    {
        Audio->PlaySpatialSFX(WeaponData->ReloadSound, MuzzlePoint->GetComponentLocation());
    }
    if (OwnerPawn && WeaponData->ReloadHaptic)
    {
        OwnerPawn->PlayControllerHaptics(bIsLeftHand, WeaponData->ReloadHaptic, 0.8f);
    }

    GetWorldTimerManager().SetTimer(ReloadTimerHandle, this, &AWeaponBase::CompleteReload, WeaponData->ReloadDurationSec, false);
}

void AWeaponBase::CompleteReload()
{
    bIsReloading = false;
    RefillMagazineInstant();
}

void AWeaponBase::RefillMagazineInstant()
{
    bIsReloading = false;
    GetWorldTimerManager().ClearTimer(ReloadTimerHandle);
    CurrentAmmo = WeaponData ? WeaponData->MagazineCapacity : 15;
    OnAmmoUpdated.Broadcast(CurrentAmmo, CurrentAmmo);
}
