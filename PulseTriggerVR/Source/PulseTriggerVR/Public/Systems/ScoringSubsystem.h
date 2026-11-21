#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "Core/PulseTypes.h"
#include "ScoringSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnScoreUpdated, const FScoreBreakdown&, CurrentBreakdown);

/**
 * Observer-pattern scoring engine calculating Beat Accuracy Bonuses,
 * Headshot Bonuses, Combo Multipliers (1x..8x), Perfect Dodge Bonuses,
 * Accuracy Ratings, and S+..D Performance Grades.
 */
UCLASS()
class PULSETRIGGERVR_API UScoringSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Scoring")
    void ResetRunMetrics();

    UFUNCTION(BlueprintCallable, Category = "Scoring")
    int32 RecordPlayerShot(const FShotResult& ShotResult);

    UFUNCTION(BlueprintCallable, Category = "Scoring")
    void NotifyPerfectDodge();

    UFUNCTION(BlueprintCallable, Category = "Scoring")
    void NotifyPlayerDamaged();

    UFUNCTION(BlueprintCallable, Category = "Scoring")
    FScoreBreakdown FinalizeScoreBreakdown();

    UFUNCTION(BlueprintPure, Category = "Scoring")
    FScoreBreakdown GetCurrentBreakdown() const { return Breakdown; }

    UFUNCTION(BlueprintPure, Category = "Scoring")
    static EPerformanceGrade ComputePerformanceGrade(const FScoreBreakdown& Metrics);

    UPROPERTY(BlueprintAssignable, Category = "Scoring")
    FOnScoreUpdated OnScoreUpdated;

private:
    void RecalculateDerivedMetrics();

    FScoreBreakdown Breakdown;
};
