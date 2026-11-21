#include "Systems/ScoringSubsystem.h"

void UScoringSubsystem::ResetRunMetrics()
{
    Breakdown = FScoreBreakdown();
    Breakdown.ComboMultiplier = 1;
    Breakdown.AccuracyPercent = 100.0f;
    Breakdown.OnBeatPercent = 100.0f;
    OnScoreUpdated.Broadcast(Breakdown);
}

int32 UScoringSubsystem::RecordPlayerShot(const FShotResult& ShotResult)
{
    ++Breakdown.ShotsFired;

    if (!ShotResult.bHit)
    {
        Breakdown.CurrentCombo = 0;
        RecalculateDerivedMetrics();
        OnScoreUpdated.Broadcast(Breakdown);
        return 0;
    }

    ++Breakdown.ShotsHit;
    ++Breakdown.CurrentCombo;
    Breakdown.MaxCombo = FMath::Max(Breakdown.MaxCombo, Breakdown.CurrentCombo);

    int32 BaseScore = ShotResult.bKill ? 200 : 100;
    int32 BeatBonus = 0;
    switch (ShotResult.BeatRank)
    {
    case EBeatAccuracyRank::Perfect:
        BeatBonus = 150;
        ++Breakdown.OnBeatHits;
        break;
    case EBeatAccuracyRank::Great:
        BeatBonus = 100;
        ++Breakdown.OnBeatHits;
        break;
    case EBeatAccuracyRank::Good:
        BeatBonus = 50;
        ++Breakdown.OnBeatHits;
        break;
    case EBeatAccuracyRank::OffBeat:
        BeatBonus = 0;
        break;
    }

    int32 HeadshotBonus = 0;
    if (ShotResult.bHeadshot)
    {
        HeadshotBonus = 125;
        ++Breakdown.Headshots;
    }

    RecalculateDerivedMetrics();
    const int32 Awarded = (BaseScore + BeatBonus + HeadshotBonus) * Breakdown.ComboMultiplier;
    Breakdown.TotalScore += Awarded;

    OnScoreUpdated.Broadcast(Breakdown);
    return Awarded;
}

void UScoringSubsystem::NotifyPerfectDodge()
{
    ++Breakdown.PerfectDodges;
    ++Breakdown.CurrentCombo;
    Breakdown.MaxCombo = FMath::Max(Breakdown.MaxCombo, Breakdown.CurrentCombo);
    RecalculateDerivedMetrics();

    Breakdown.TotalScore += 250 * Breakdown.ComboMultiplier;
    OnScoreUpdated.Broadcast(Breakdown);
}

void UScoringSubsystem::NotifyPlayerDamaged()
{
    ++Breakdown.DamageTaken;
    Breakdown.CurrentCombo = 0;
    RecalculateDerivedMetrics();
    OnScoreUpdated.Broadcast(Breakdown);
}

void UScoringSubsystem::RecalculateDerivedMetrics()
{
    if (Breakdown.CurrentCombo >= 24)
    {
        Breakdown.ComboMultiplier = 8;
    }
    else if (Breakdown.CurrentCombo >= 12)
    {
        Breakdown.ComboMultiplier = 4;
    }
    else if (Breakdown.CurrentCombo >= 4)
    {
        Breakdown.ComboMultiplier = 2;
    }
    else
    {
        Breakdown.ComboMultiplier = 1;
    }

    Breakdown.AccuracyPercent = (Breakdown.ShotsFired > 0)
        ? (static_cast<float>(Breakdown.ShotsHit) / static_cast<float>(Breakdown.ShotsFired)) * 100.0f
        : 100.0f;

    Breakdown.OnBeatPercent = (Breakdown.ShotsHit > 0)
        ? (static_cast<float>(Breakdown.OnBeatHits) / static_cast<float>(Breakdown.ShotsHit)) * 100.0f
        : 100.0f;
}

FScoreBreakdown UScoringSubsystem::FinalizeScoreBreakdown()
{
    RecalculateDerivedMetrics();
    Breakdown.FinalGrade = ComputePerformanceGrade(Breakdown);
    OnScoreUpdated.Broadcast(Breakdown);
    return Breakdown;
}

EPerformanceGrade UScoringSubsystem::ComputePerformanceGrade(const FScoreBreakdown& Metrics)
{
    const float Composite =
        (Metrics.AccuracyPercent * 0.48f) +
        (Metrics.OnBeatPercent * 0.48f) +
        FMath::Clamp(static_cast<float>(Metrics.PerfectDodges) * 2.0f, 0.0f, 8.0f) -
        (static_cast<float>(Metrics.DamageTaken) * 8.0f);

    if (Composite >= 95.0f && Metrics.DamageTaken == 0)
    {
        return EPerformanceGrade::SPlus;
    }
    if (Composite >= 88.0f)
    {
        return EPerformanceGrade::S;
    }
    if (Composite >= 78.0f)
    {
        return EPerformanceGrade::A;
    }
    if (Composite >= 65.0f)
    {
        return EPerformanceGrade::B;
    }
    if (Composite >= 50.0f)
    {
        return EPerformanceGrade::C;
    }
    return EPerformanceGrade::D;
}
