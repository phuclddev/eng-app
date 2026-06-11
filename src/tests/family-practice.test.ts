import { describe, expect, it } from "vitest";

import {
  buildFamilyPracticeDeck,
  buildFamilyPracticeSummary,
  calculateFamilyChunkPriority,
  evaluateFamilyExerciseAnswer,
  inferFamilyChunkStagePlan,
  type FamilyPracticeChunkRecord,
} from "@/lib/family-practice";
import type {
  FamilyPracticeExercise,
  FamilyReviewSnapshot,
} from "@/lib/types";

function createChunk(
  id: string,
  overrides: Partial<FamilyPracticeChunkRecord> = {},
): FamilyPracticeChunkRecord {
  return {
    id,
    userId: "user-1",
    text: `chunk-${id}`,
    meaningVi: `meaning-${id}`,
    usageContext: `Usage context for ${id} during a family interaction.`,
    speakerRole: "FATHER",
    childFocus: "BOTH",
    scenarioCategory: "Bedtime",
    difficulty: 2,
    frequencyScore: 3,
    personalizationScore: 3,
    exampleSentence: `Please remember to chunk-${id} before dinner.`,
    notes: null,
    sourceConversationId: null,
    status: "APPROVED",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    review: null,
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<FamilyReviewSnapshot> = {},
): FamilyReviewSnapshot {
  return {
    nextReviewAt: "2026-06-11T00:00:00.000Z",
    intervalDays: 1,
    masteryScore: 0,
    reviewCount: 0,
    lastReviewedAt: null,
    lastCorrect: null,
    ...overrides,
  };
}

describe("inferFamilyChunkStagePlan", () => {
  it("routes new chunks to FAMILY_CHUNK_RECALL", () => {
    expect(
      inferFamilyChunkStagePlan(createChunk("new", { review: null })).exerciseType,
    ).toBe("FAMILY_CHUNK_RECALL");
  });

  it("routes very low mastery to FILL_IN_DIALOG", () => {
    expect(
      inferFamilyChunkStagePlan(
        createChunk("weak", {
          review: snapshot({ masteryScore: 20, reviewCount: 2 }),
        }),
      ).exerciseType,
    ).toBe("FILL_IN_DIALOG");
  });

  it("routes mid mastery to VI_TO_CHUNK", () => {
    expect(
      inferFamilyChunkStagePlan(
        createChunk("mid", {
          review: snapshot({ masteryScore: 50, reviewCount: 3 }),
        }),
      ).exerciseType,
    ).toBe("VI_TO_CHUNK");
  });

  it("routes higher mastery to NATURAL_RESPONSE", () => {
    expect(
      inferFamilyChunkStagePlan(
        createChunk("high", {
          review: snapshot({ masteryScore: 80, reviewCount: 4 }),
        }),
      ).exerciseType,
    ).toBe("NATURAL_RESPONSE");
  });

  it("routes mastered chunks to CONTINUE_CONVERSATION", () => {
    expect(
      inferFamilyChunkStagePlan(
        createChunk("master", {
          review: snapshot({ masteryScore: 95, reviewCount: 6 }),
        }),
      ).exerciseType,
    ).toBe("CONTINUE_CONVERSATION");
  });
});

describe("calculateFamilyChunkPriority", () => {
  const now = new Date("2026-06-11T00:00:00.000Z");

  it("prefers due reviews over new chunks", () => {
    const due = createChunk("due", {
      personalizationScore: 1,
      frequencyScore: 1,
      review: snapshot({
        nextReviewAt: "2026-06-10T00:00:00.000Z",
        masteryScore: 50,
        reviewCount: 2,
      }),
    });

    const fresh = createChunk("fresh", {
      personalizationScore: 1,
      frequencyScore: 1,
      review: null,
    });

    expect(
      calculateFamilyChunkPriority({ chunk: due, mode: "DAILY", now }),
    ).toBeGreaterThan(
      calculateFamilyChunkPriority({ chunk: fresh, mode: "DAILY", now }),
    );
  });

  it("boosts personalization and frequency above unremarkable chunks", () => {
    const personal = createChunk("personal", {
      personalizationScore: 5,
      frequencyScore: 5,
    });

    const plain = createChunk("plain", {
      personalizationScore: 1,
      frequencyScore: 1,
    });

    expect(
      calculateFamilyChunkPriority({ chunk: personal, mode: "DAILY", now }),
    ).toBeGreaterThan(
      calculateFamilyChunkPriority({ chunk: plain, mode: "DAILY", now }),
    );
  });

  it("treats due reviews as the highest priority signal", () => {
    const dueWeak = createChunk("weak", {
      personalizationScore: 1,
      frequencyScore: 1,
      review: snapshot({
        nextReviewAt: "2026-06-10T00:00:00.000Z",
        masteryScore: 20,
        reviewCount: 2,
      }),
    });

    const personal = createChunk("personal", {
      personalizationScore: 5,
      frequencyScore: 5,
    });

    expect(
      calculateFamilyChunkPriority({ chunk: dueWeak, mode: "DAILY", now }),
    ).toBeGreaterThan(
      calculateFamilyChunkPriority({ chunk: personal, mode: "DAILY", now }),
    );
  });

  it("filters mastered chunks out of DAILY mode priority", () => {
    const mastered = createChunk("master", {
      review: snapshot({ masteryScore: 95, reviewCount: 6 }),
    });
    const mid = createChunk("mid", {
      review: snapshot({ masteryScore: 60, reviewCount: 3 }),
    });

    expect(
      calculateFamilyChunkPriority({ chunk: mastered, mode: "DAILY", now }),
    ).toBeLessThan(
      calculateFamilyChunkPriority({ chunk: mid, mode: "DAILY", now }),
    );
  });
});

describe("buildFamilyPracticeDeck", () => {
  it("prioritizes due reviews, then personalization, then weak chunks", () => {
    const now = new Date("2026-06-11T00:00:00.000Z");
    const chunks = [
      createChunk("a-fresh", {
        personalizationScore: 1,
        frequencyScore: 1,
        review: null,
      }),
      createChunk("b-due", {
        personalizationScore: 2,
        frequencyScore: 2,
        review: snapshot({
          nextReviewAt: "2026-06-10T00:00:00.000Z",
          masteryScore: 45,
          reviewCount: 2,
        }),
      }),
      createChunk("c-personal", {
        personalizationScore: 5,
        frequencyScore: 5,
        review: snapshot({
          nextReviewAt: "2026-06-20T00:00:00.000Z",
          masteryScore: 70,
          reviewCount: 3,
        }),
      }),
    ];

    const deck = buildFamilyPracticeDeck({
      chunks,
      mode: "DAILY",
      maxItems: 3,
      now,
    });

    expect(deck[0].familyChunkId).toBe("b-due");
    expect(deck.map((exercise) => exercise.familyChunkId)).toEqual(
      expect.arrayContaining(["a-fresh", "b-due", "c-personal"]),
    );
  });

  it("is deterministic for the same input", () => {
    const chunks = [
      createChunk("x", { review: null }),
      createChunk("y", {
        review: snapshot({ masteryScore: 65, reviewCount: 3 }),
      }),
    ];

    const first = buildFamilyPracticeDeck({
      chunks,
      mode: "DAILY",
      now: new Date("2026-06-11T00:00:00.000Z"),
    });
    const second = buildFamilyPracticeDeck({
      chunks,
      mode: "DAILY",
      now: new Date("2026-06-11T00:00:00.000Z"),
    });

    expect(second).toEqual(first);
  });
});

describe("evaluateFamilyExerciseAnswer", () => {
  function exercise(
    type: FamilyPracticeExercise["type"],
    expectedAnswer = "Brush your teeth",
  ): FamilyPracticeExercise {
    return {
      id: "ex-1",
      familyChunkId: "chunk-1",
      type,
      prompt: "Test prompt",
      expectedAnswer,
      chunk: expectedAnswer,
      meaningVi: "đánh răng",
      usageContext: "Bedtime routine",
      exampleSentence: null,
      speakerRole: "FATHER",
      childFocus: "BOTH",
      scenarioCategory: "Bedtime",
    };
  }

  it("treats exact matches as correct for recall-style exercises", () => {
    expect(
      evaluateFamilyExerciseAnswer(exercise("VI_TO_CHUNK"), "Brush your teeth"),
    ).toBe(true);
  });

  it("rejects mismatched natural responses", () => {
    expect(
      evaluateFamilyExerciseAnswer(
        exercise("NATURAL_RESPONSE"),
        "Wash the dishes",
      ),
    ).toBe(false);
  });

  it("accepts CONTINUE_CONVERSATION answers that include the chunk and 6+ words", () => {
    expect(
      evaluateFamilyExerciseAnswer(
        exercise("CONTINUE_CONVERSATION"),
        "Okay sweetie, please brush your teeth before we read.",
      ),
    ).toBe(true);
  });

  it("rejects short CONTINUE_CONVERSATION answers even when they include the chunk", () => {
    expect(
      evaluateFamilyExerciseAnswer(
        exercise("CONTINUE_CONVERSATION"),
        "Brush your teeth",
      ),
    ).toBe(false);
  });
});

describe("buildFamilyPracticeSummary", () => {
  it("computes correctness and accuracy", () => {
    const summary = buildFamilyPracticeSummary([
      {
        familyChunkId: "chunk-1",
        exerciseType: "VI_TO_CHUNK",
        prompt: "p",
        expectedAnswer: "Brush your teeth",
        userAnswer: "Brush your teeth",
        isCorrect: true,
        responseTimeMs: 5_000,
        confidenceLevel: "EASY",
      },
      {
        familyChunkId: "chunk-2",
        exerciseType: "FILL_IN_DIALOG",
        prompt: "p",
        expectedAnswer: "Put your toys away",
        userAnswer: "Put your toys",
        isCorrect: false,
        responseTimeMs: 10_000,
        confidenceLevel: "MEDIUM",
      },
    ]);

    expect(summary.totalQuestions).toBe(2);
    expect(summary.correctAnswers).toBe(1);
    expect(summary.averageResponseMs).toBe(7_500);
    expect(summary.accuracyRate).toBe(50);
    expect(summary.score).toBe(50);
  });

  it("handles empty answer lists", () => {
    const summary = buildFamilyPracticeSummary([]);

    expect(summary.totalQuestions).toBe(0);
    expect(summary.correctAnswers).toBe(0);
    expect(summary.accuracyRate).toBe(0);
    expect(summary.averageResponseMs).toBe(0);
  });
});
