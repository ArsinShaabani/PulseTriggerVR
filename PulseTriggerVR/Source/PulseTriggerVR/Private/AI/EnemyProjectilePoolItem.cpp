#include "AI/EnemyProjectilePoolItem.h"
#include "VR/VRPlayerPawn.h"
#include "Core/ObjectPoolSubsystem.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"

AEnemyProjectilePoolItem::AEnemyProjectilePoolItem()
{
    PrimaryActorTick.bCanEverTick = true;

    CollisionSphere = CreateDefaultSubobject<USphereComponent>(TEXT("CollisionSphere"));
    RootComponent = CollisionSphere;
    CollisionSphere->SetSphereRadius(10.0f);
    CollisionSphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
    CollisionSphere->SetGenerateOverlapEvents(true);

    ProjectileMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("ProjectileMesh"));
    ProjectileMesh->SetupAttachment(CollisionSphere);
    ProjectileMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    ProjectileMesh->SetCastShadow(false);
}

void AEnemyProjectilePoolItem::BeginPlay()
{
    Super::BeginPlay();
    CollisionSphere->OnComponentBeginOverlap.AddDynamic(this, &AEnemyProjectilePoolItem::HandleOverlapBegin);
}

void AEnemyProjectilePoolItem::LaunchProjectile(const FVector& StartLocation, const FVector& VelocityVector, int32 InDamage, float MaxLifeSec)
{
    SetActorLocation(StartLocation, false, nullptr, ETeleportType::TeleportPhysics);
    CurrentVelocity = VelocityVector;
    SetActorRotation(VelocityVector.Rotation());
    Damage = InDamage;
    RemainingLife = MaxLifeSec;
    bTriggeredNearMiss = false;
}

void AEnemyProjectilePoolItem::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    AddActorWorldOffset(CurrentVelocity * DeltaTime, false);
    RemainingLife -= DeltaTime;
    if (RemainingLife <= 0.0f)
    {
        ReturnSelfToPool();
    }
}

void AEnemyProjectilePoolItem::HandleOverlapBegin(UPrimitiveComponent* OverlappedComp, AActor* OtherActor,
    UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
    AVRPlayerPawn* PlayerPawn = Cast<AVRPlayerPawn>(OtherActor);
    if (!PlayerPawn || !OtherComp)
    {
        return;
    }

    if (OtherComp->GetFName() == FName("HeadHitbox"))
    {
        PlayerPawn->ApplyIncomingDamage(Damage);
        ReturnSelfToPool();
    }
    else if (OtherComp->GetFName() == FName("NearMissDodgeSphere") && !bTriggeredNearMiss)
    {
        bTriggeredNearMiss = true;
        PlayerPawn->NotifyProjectileNearMiss();
    }
}

void AEnemyProjectilePoolItem::ReturnSelfToPool()
{
    if (UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>())
    {
        PoolSys->ReturnActor(this);
    }
}

void AEnemyProjectilePoolItem::OnAcquiredFromPool_Implementation()
{
    bIsPooled = false;
    bTriggeredNearMiss = false;
}

void AEnemyProjectilePoolItem::OnReturnedToPool_Implementation()
{
    bIsPooled = true;
    CurrentVelocity = FVector::ZeroVector;
    RemainingLife = 0.0f;
}
