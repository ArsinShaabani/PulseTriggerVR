#pragma once

#include "CoreMinimal.h"
#include "Weapons/WeaponBase.h"
#include "SemiAutoPistol.generated.h"

/**
 * Standard semi-auto pistol implementation with beat-synced slide feedback.
 */
UCLASS()
class PULSETRIGGERVR_API ASemiAutoPistol : public AWeaponBase
{
    GENERATED_BODY()

public:
    ASemiAutoPistol();

    virtual bool TryFire() override;
};
