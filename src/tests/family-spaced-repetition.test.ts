import { describe, expect, it } from "vitest";

import { calculateFamilyReviewUpdate } from "@/lib/family-spaced-repetition";

describe("calculateFamilyReviewUpdate", () => {
  it("resets the family interval after an incorrect answer", () => {
    const result = calculateFamilyReviewUpdate({
      wasCorrect: false,
      confidence: "HARD",
      responseTimeMs: 18_000,
      reviewCount: 3,
      currentIntervalDays: 7,
      currentEaseFactor: 2.5,
      currentMasteryScore: 60,
      now: new Date("2026-06-11T00:00:00.000Z"),
    });

    expect(result.intervalDays).toBe(1);
    expect(result.masteryScore).toBe(52);
    expect(result.nextReviewAt.toISOString().slice(0, 10)).toBe("2026-06-12");
  });

  it("extends the family interval for confident correct answers", () => {
    const result = calculateFamilyReviewUpdate({
      wasCorrect: true,
      confidence: "EASY",
      responseTimeMs: 5_000,
      reviewCount: 2,
      currentIntervalDays: 3,
      currentEaseFactor: 2.5,
      currentMasteryScore: 60,
    });

    expect(result.intervalDays).toBeGreaterThan(3);
    expect(result.masteryScore).toBeGreaterThan(60);
  });

  it("stays inside the supported family intervals", () => {
    const result = calculateFamilyReviewUpdate({
      wasCorrect: true,
      confidence: "EASY",
      responseTimeMs: 5_000,
      reviewCount: 9,
      currentIntervalDays: 30,
      currentEaseFactor: 2.5,
      currentMasteryScore: 90,
    });

    expect([1, 3, 7, 14, 30]).toContain(result.intervalDays);
  });
});
