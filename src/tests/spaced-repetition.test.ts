import { describe, expect, it } from "vitest";

import { calculateReviewUpdate } from "@/lib/spaced-repetition";

describe("calculateReviewUpdate", () => {
  it("resets interval for incorrect answers", () => {
    const result = calculateReviewUpdate({
      wasCorrect: false,
      confidence: "HARD",
      responseMs: 20_000,
      reviewCount: 2,
      currentIntervalDays: 7,
      currentEaseFactor: 2.5,
      currentMasteryScore: 50,
      now: new Date("2026-05-27T00:00:00.000Z"),
    });

    expect(result.intervalDays).toBe(1);
    expect(result.masteryScore).toBe(42);
  });

  it("extends interval for confident correct answers", () => {
    const result = calculateReviewUpdate({
      wasCorrect: true,
      confidence: "EASY",
      responseMs: 5_000,
      reviewCount: 2,
      currentIntervalDays: 3,
      currentEaseFactor: 2.5,
      currentMasteryScore: 60,
      now: new Date("2026-05-27T00:00:00.000Z"),
    });

    expect(result.intervalDays).toBeGreaterThan(3);
    expect(result.masteryScore).toBeGreaterThan(60);
  });
});
