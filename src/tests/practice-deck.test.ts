import { describe, expect, it } from "vitest";

import { buildPracticeDeck, inferChunkStagePlan } from "@/lib/practice";
import type { ChunkRecord } from "@/lib/types";

function createChunk(
  id: string,
  overrides: Partial<ChunkRecord> = {},
): ChunkRecord {
  return {
    id,
    chunk: `chunk-${id}`,
    meaningVi: `meaning-${id}`,
    example: `Example sentence for chunk ${id}.`,
    wrongExamples: [],
    difficulty: 2,
    bandLevel: 6,
    grammarPattern: null,
    tags: [],
    notes: null,
    topic: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    review: null,
    ...overrides,
  };
}

describe("inferChunkStagePlan", () => {
  it("maps chunks through recognition, recall, and production stages using existing review metadata", () => {
    expect(
      inferChunkStagePlan(
        createChunk("new", {
          review: null,
        }),
      ),
    ).toMatchObject({
      learningStage: "RECOGNITION",
      exerciseType: "MULTIPLE_CHOICE",
      stageRank: 0,
    });

    expect(
      inferChunkStagePlan(
        createChunk("early", {
          review: {
            nextReviewAt: "2026-05-29T00:00:00.000Z",
            intervalDays: 1,
            masteryScore: 25,
            reviewCount: 1,
          },
        }),
      ),
    ).toMatchObject({
      learningStage: "RECOGNITION",
      exerciseType: "FILL_IN_BLANK",
      stageRank: 1,
    });

    expect(
      inferChunkStagePlan(
        createChunk("recall", {
          review: {
            nextReviewAt: "2026-05-29T00:00:00.000Z",
            intervalDays: 3,
            masteryScore: 62,
            reviewCount: 3,
          },
        }),
      ),
    ).toMatchObject({
      learningStage: "RECALL",
      exerciseType: "VI_TO_CHUNK",
      stageRank: 2,
    });

    expect(
      inferChunkStagePlan(
        createChunk("rewrite", {
          review: {
            nextReviewAt: "2026-06-03T00:00:00.000Z",
            intervalDays: 7,
            masteryScore: 82,
            reviewCount: 4,
          },
          wrongExamples: ["This use chunk wrongly."],
        }),
      ),
    ).toMatchObject({
      learningStage: "PRODUCTION",
      exerciseType: "REWRITE_SENTENCE",
      stageRank: 3,
    });

    expect(
      inferChunkStagePlan(
        createChunk("create", {
          review: {
            nextReviewAt: "2026-06-20T00:00:00.000Z",
            intervalDays: 30,
            masteryScore: 94,
            reviewCount: 6,
          },
        }),
      ),
    ).toMatchObject({
      learningStage: "PRODUCTION",
      exerciseType: "CREATE_SENTENCE",
      stageRank: 4,
    });
  });
});

describe("buildPracticeDeck", () => {
  it("builds a staged deck from recognition to production instead of rotating by index", () => {
    const chunks = [
      createChunk("production-rewrite", {
        review: {
          nextReviewAt: "2026-06-02T00:00:00.000Z",
          intervalDays: 7,
          masteryScore: 84,
          reviewCount: 4,
        },
        wrongExamples: ["Wrong rewrite prompt."],
      }),
      createChunk("recognition-new", {
        review: null,
      }),
      createChunk("production-create", {
        review: {
          nextReviewAt: "2026-06-20T00:00:00.000Z",
          intervalDays: 30,
          masteryScore: 95,
          reviewCount: 6,
        },
      }),
      createChunk("recall", {
        review: {
          nextReviewAt: "2026-05-30T00:00:00.000Z",
          intervalDays: 3,
          masteryScore: 60,
          reviewCount: 3,
        },
      }),
      createChunk("recognition-fill", {
        review: {
          nextReviewAt: "2026-05-29T00:00:00.000Z",
          intervalDays: 1,
          masteryScore: 30,
          reviewCount: 1,
        },
      }),
    ];

    const deck = buildPracticeDeck(chunks, "LEARN", 5);

    expect(
      deck.map((exercise) => ({
        id: exercise.chunkId,
        type: exercise.type,
        stage: exercise.learningStage,
      })),
    ).toEqual([
      {
        id: "recognition-new",
        type: "MULTIPLE_CHOICE",
        stage: "RECOGNITION",
      },
      {
        id: "recognition-fill",
        type: "FILL_IN_BLANK",
        stage: "RECOGNITION",
      },
      {
        id: "recall",
        type: "VI_TO_CHUNK",
        stage: "RECALL",
      },
      {
        id: "production-rewrite",
        type: "REWRITE_SENTENCE",
        stage: "PRODUCTION",
      },
      {
        id: "production-create",
        type: "CREATE_SENTENCE",
        stage: "PRODUCTION",
      },
    ]);
  });

  it("keeps deterministic output for the same input", () => {
    const chunks = [
      createChunk("b", { review: null }),
      createChunk("a", {
        review: {
          nextReviewAt: "2026-05-30T00:00:00.000Z",
          intervalDays: 3,
          masteryScore: 55,
          reviewCount: 2,
        },
      }),
    ];

    const firstDeck = buildPracticeDeck(chunks, "LEARN", 2);
    const secondDeck = buildPracticeDeck(chunks, "LEARN", 2);

    expect(secondDeck).toEqual(firstDeck);
  });
});
