import { describe, expect, it } from "vitest";

import { selectLearnChunks } from "@/lib/learn-selection";
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

describe("selectLearnChunks", () => {
  it("prioritizes unseen chunks first", () => {
    const now = new Date("2026-05-28T00:00:00.000Z");
    const unseenA = createChunk("unseen-a", {
      createdAt: "2026-05-01T00:00:00.000Z",
      difficulty: 1,
    });
    const unseenB = createChunk("unseen-b", {
      createdAt: "2026-05-02T00:00:00.000Z",
      difficulty: 2,
    });
    const weak = createChunk("weak", {
      review: {
        nextReviewAt: "2026-05-27T00:00:00.000Z",
        intervalDays: 3,
        masteryScore: 40,
        reviewCount: 2,
      },
    });
    const regular = createChunk("regular", {
      review: {
        nextReviewAt: "2026-05-30T00:00:00.000Z",
        intervalDays: 7,
        masteryScore: 72,
        reviewCount: 3,
      },
    });

    const selected = selectLearnChunks(
      [regular, weak, unseenB, unseenA],
      { maxItems: 4, now },
    );

    expect(selected.map((chunk) => chunk.id)).toEqual([
      "unseen-a",
      "unseen-b",
      "weak",
      "regular",
    ]);
  });

  it("includes weak chunks even when unseen chunks exceed deck size", () => {
    const now = new Date("2026-05-28T00:00:00.000Z");
    const unseenChunks = Array.from({ length: 6 }, (_, index) =>
      createChunk(`unseen-${index + 1}`, {
        createdAt: `2026-05-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
    const weakChunk = createChunk("weak", {
      review: {
        nextReviewAt: "2026-05-27T00:00:00.000Z",
        intervalDays: 1,
        masteryScore: 35,
        reviewCount: 4,
      },
    });

    const selected = selectLearnChunks(
      [...unseenChunks, weakChunk],
      { maxItems: 5, now },
    );

    expect(selected.map((chunk) => chunk.id)).toContain("weak");
    expect(selected.at(-1)?.id).toBe("weak");
  });

  it("deprioritizes recently mastered chunks behind active reinforcement chunks", () => {
    const now = new Date("2026-05-28T00:00:00.000Z");
    const regularA = createChunk("regular-a", {
      review: {
        nextReviewAt: "2026-05-29T00:00:00.000Z",
        intervalDays: 7,
        masteryScore: 68,
        reviewCount: 2,
      },
    });
    const regularB = createChunk("regular-b", {
      review: {
        nextReviewAt: "2026-05-30T00:00:00.000Z",
        intervalDays: 7,
        masteryScore: 74,
        reviewCount: 2,
      },
    });
    const mastered = createChunk("mastered", {
      review: {
        nextReviewAt: "2026-06-20T00:00:00.000Z",
        intervalDays: 30,
        masteryScore: 92,
        reviewCount: 5,
      },
    });

    const selected = selectLearnChunks(
      [mastered, regularB, regularA],
      { maxItems: 2, now },
    );

    expect(selected.map((chunk) => chunk.id)).toEqual([
      "regular-a",
      "regular-b",
    ]);
  });
});
