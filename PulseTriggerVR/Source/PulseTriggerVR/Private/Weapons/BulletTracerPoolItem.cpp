#include "Weapons/BulletTracerPoolItem.h"
#include "Core/ObjectPoolSubsystem.h"
#include "Components/StaticMeshComponent.h"

ABulletTracerPoolItem::ABulletTracerPoolItem()
{
    PrimaryActorTick.bCanEverTick = true;

    BeamMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BeamMesh"));
    RootComponent = BeamMesh;
    BeamMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    BeamMesh->SetCastShadow(false);
}

void ABulletTracerPoolItem::ConfigureBeam(const FVector& StartLocation, const FVector& EndLocation, const FLinearColor& BeamColor, float LifetimeSec)
{
    const FVector Delta = EndLocation - StartLocation;
    const float Length = FMath::Max(1.0f, Delta.Size());
    const FVector MidPoint = StartLocation + (Delta * 0.5f);
    const FRotator Orientation = Delta.Rotation();

    SetActorLocationAndRotation(MidPoint, Orientation);
    // Assumes a 100cm unit cylinder/box aligned along X
    SetActorScale3D(FVector(Length / 100.0f, 0.025f, 0.025f));
    BeamMesh->SetVectorParameterValueOnMaterials(TEXT("EmissiveColor"), FVector(BeamColor.R, BeamColor.G, BeamColor.B));

    RemainingLife = LifetimeSec;
}

void ABulletTracerPoolItem::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    RemainingLife -= DeltaTime;
    if (RemainingLife <= 0.0f)
    {
        if (UObjectPoolSubsystem* PoolSys = GetWorld()->GetSubsystem<UObjectPoolSubsystem>())
        {
            PoolSys->ReturnActor(this);
        }
    }
}

void ABulletTracerPoolItem::OnAcquiredFromPool_Implementation()
{
    bIsPooled = false;
}

void ABulletTracerPoolItem::OnReturnedToPool_Implementation()
{
    bIsPooled = true;
    RemainingLife = 0.0f;
}
