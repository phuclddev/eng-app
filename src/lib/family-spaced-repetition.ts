import { FAMILY_REVIEW_INTERVALS } from "@/lib/constants";
import type { ConfidenceLevel } from "@/lib/types";
import { clamp } from "@/lib/utils";

type FamilySchedulerInput = {
  wasCorrect: boolean;
  confidence: ConfidenceLevel;
  responseTimeMs: number;
  reviewCount: number;
  currentIntervalDays?: number;
  currentEaseFactor?: number;
  currentMasteryScore?: number;
  now?: Date;
};

function closestSupportedInterval(value: number) {
  return FAMILY_REVIEW_INTERVALS.reduce((closest, current) => {
    return Math.abs(current - value) < Math.abs(closest - value)
      ? current
      : closest;
  }, FAMILY_REVIEW_INTERVALS[0]);
}

export function calculateFamilyReviewUpdate(input: FamilySchedulerInput) {
  const baseEase = input.currentEaseFactor ?? 2.5;
  const now = input.now ?? new Date();

  if (!input.wasCorrect) {
    const nextReviewAt = new Date(now);
    nextReviewAt.setDate(now.getDate() + 1);

    return {
      intervalDays: 1,
      easeFactor: clamp(baseEase - 0.2, 1.3, 3),
      masteryScore: clamp((input.currentMasteryScore ?? 0) - 8, 0, 100),
      nextReviewAt,
    };
  }

  const confidenceMultiplier = {
    EASY: 1.45,
    MEDIUM: 1.1,
    HARD: 0.85,
  }[input.confidence];

  const speedMultiplier =
    input.responseTimeMs < 7_000
      ? 1.15
      : input.responseTimeMs > 18_000
        ? 0.9
        : 1;

  const baseInterval =
    FAMILY_REVIEW_INTERVALS[
      Math.min(input.reviewCount, FAMILY_REVIEW_INTERVALS.length - 1)
    ] ?? FAMILY_REVIEW_INTERVALS.at(-1)!;

  const rawInterval = Math.max(
    input.currentIntervalDays ?? 1,
    Math.round(baseInterval * confidenceMultiplier * speedMultiplier),
  );

  const intervalDays = closestSupportedInterval(rawInterval);
  const easeDelta = {
    EASY: 0.16,
    MEDIUM: 0.07,
    HARD: -0.03,
  }[input.confidence];
  const masteryDelta = {
    EASY: 12,
    MEDIUM: 8,
    HARD: 5,
  }[input.confidence];

  const nextReviewAt = new Date(now);
  nextReviewAt.setDate(now.getDate() + intervalDays);

  return {
    intervalDays,
    easeFactor: clamp(baseEase + easeDelta, 1.3, 3),
    masteryScore: clamp((input.currentMasteryScore ?? 0) + masteryDelta, 0, 100),
    nextReviewAt,
  };
}
