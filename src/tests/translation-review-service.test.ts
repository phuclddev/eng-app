import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/lib/errors";

const sentenceFindUnique = vi.fn();
const reviewFindUnique = vi.fn();
const reviewUpsert = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    translationSentence: { findUnique: sentenceFindUnique },
    translationSentenceReview: {
      findUnique: reviewFindUnique,
      upsert: reviewUpsert,
    },
  },
}));

let recordTranslationReview: typeof import("@/server/translation/translation-review-service").recordTranslationReview;

beforeAll(async () => {
  ({ recordTranslationReview } = await import(
    "@/server/translation/translation-review-service"
  ));
});

beforeEach(() => {
  sentenceFindUnique.mockReset();
  reviewFindUnique.mockReset();
  reviewUpsert.mockReset();
});

describe("recordTranslationReview", () => {
  it("rejects missing sentences", async () => {
    sentenceFindUnique.mockResolvedValueOnce(null);

    await expect(
      recordTranslationReview({
        userId: "user-1",
        payload: { sentenceId: "missing", confidence: "EASY" },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(reviewUpsert).not.toHaveBeenCalled();
  });

  it("starts a new review record when none exists", async () => {
    sentenceFindUnique.mockResolvedValueOnce({ id: "sentence-1" });
    reviewFindUnique.mockResolvedValueOnce(null);
    reviewUpsert.mockResolvedValueOnce({ id: "review-1" });
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      orderIndex: 0,
      englishText: "I wake up.",
      vietnameseText: "Tôi thức dậy.",
      notes: null,
      reviews: [
        {
          reviewCount: 1,
          lastConfidence: "EASY",
          easyCount: 1,
          mediumCount: 0,
          hardCount: 0,
          lastReviewedAt: new Date("2026-06-11T12:00:00.000Z"),
        },
      ],
      chunkMappings: [],
    });

    const sentence = await recordTranslationReview({
      userId: "user-1",
      payload: { sentenceId: "sentence-1", confidence: "EASY" },
    });

    expect(sentence.review?.easyCount).toBe(1);
    expect(sentence.review?.reviewCount).toBe(1);

    const upsertArgs = reviewUpsert.mock.calls[0][0];
    expect(upsertArgs.create.easyCount).toBe(1);
    expect(upsertArgs.create.mediumCount).toBe(0);
    expect(upsertArgs.create.hardCount).toBe(0);
  });

  it("increments the matching confidence counter and review count on repeat", async () => {
    sentenceFindUnique.mockResolvedValueOnce({ id: "sentence-1" });
    reviewFindUnique.mockResolvedValueOnce({
      reviewCount: 2,
      lastConfidence: "MEDIUM",
      easyCount: 1,
      mediumCount: 1,
      hardCount: 0,
    });
    reviewUpsert.mockResolvedValueOnce({ id: "review-1" });
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      orderIndex: 0,
      englishText: "I wake up.",
      vietnameseText: "Tôi thức dậy.",
      notes: null,
      reviews: [
        {
          reviewCount: 3,
          lastConfidence: "HARD",
          easyCount: 1,
          mediumCount: 1,
          hardCount: 1,
          lastReviewedAt: new Date("2026-06-11T12:00:00.000Z"),
        },
      ],
      chunkMappings: [],
    });

    await recordTranslationReview({
      userId: "user-1",
      payload: { sentenceId: "sentence-1", confidence: "HARD" },
    });

    const upsertArgs = reviewUpsert.mock.calls[0][0];
    expect(upsertArgs.update.hardCount).toBe(1);
    expect(upsertArgs.update.mediumCount).toBe(1);
    expect(upsertArgs.update.easyCount).toBe(1);
    expect(upsertArgs.update.reviewCount).toBe(3);
  });
});
