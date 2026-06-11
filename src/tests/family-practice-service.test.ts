import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError, ValidationError } from "@/lib/errors";

const familyChunkFindMany = vi.fn();
const familyReviewFindMany = vi.fn();
const familyReviewFindUnique = vi.fn();
const familyReviewUpsert = vi.fn();
const familyPracticeSessionCreate = vi.fn();
const familyPracticeAnswerCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    familyChunk: {
      findMany: familyChunkFindMany,
    },
    familyReviewSchedule: {
      findMany: familyReviewFindMany,
      findUnique: familyReviewFindUnique,
      upsert: familyReviewUpsert,
    },
    familyPracticeSession: {
      create: familyPracticeSessionCreate,
    },
    familyPracticeAnswer: {
      create: familyPracticeAnswerCreate,
    },
  },
}));

let buildFamilyPracticeDeckForUser: typeof import("@/server/family/family-practice-service").buildFamilyPracticeDeckForUser;
let submitFamilyPracticeSession: typeof import("@/server/family/family-practice-service").submitFamilyPracticeSession;

beforeAll(async () => {
  ({ buildFamilyPracticeDeckForUser, submitFamilyPracticeSession } = await import(
    "@/server/family/family-practice-service"
  ));
});

beforeEach(() => {
  familyChunkFindMany.mockReset();
  familyReviewFindMany.mockReset();
  familyReviewFindUnique.mockReset();
  familyReviewUpsert.mockReset();
  familyPracticeSessionCreate.mockReset();
  familyPracticeAnswerCreate.mockReset();
  transaction.mockReset();
  transaction.mockImplementation(
    async (callback: (tx: typeof prismaTx) => Promise<unknown>) =>
      callback(prismaTx),
  );
});

const prismaTx = {
  familyPracticeSession: {
    create: (...args: unknown[]) => familyPracticeSessionCreate(...args),
  },
  familyPracticeAnswer: {
    create: (...args: unknown[]) => familyPracticeAnswerCreate(...args),
  },
  familyReviewSchedule: {
    findUnique: (...args: unknown[]) => familyReviewFindUnique(...args),
    upsert: (...args: unknown[]) => familyReviewUpsert(...args),
  },
};

describe("buildFamilyPracticeDeckForUser", () => {
  it("only uses approved family chunks", async () => {
    familyChunkFindMany.mockResolvedValueOnce([]);

    const deck = await buildFamilyPracticeDeckForUser({
      userId: "user-1",
      mode: "DAILY",
    });

    expect(familyChunkFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: "APPROVED",
      },
    });
    expect(deck.exercises).toEqual([]);
    expect(deck.totalApprovedChunks).toBe(0);
    expect(deck.totalDue).toBe(0);
  });

  it("builds a deck from approved chunks with their review snapshots", async () => {
    const baseChunk = {
      id: "chunk-1",
      userId: "user-1",
      text: "Brush your teeth",
      meaningVi: "đánh răng",
      usageContext: "Bedtime routine",
      speakerRole: "FATHER",
      childFocus: "BOTH",
      scenarioCategory: "Bedtime",
      difficulty: 2,
      frequencyScore: 3,
      personalizationScore: 4,
      exampleSentence: "Please brush your teeth now.",
      notes: null,
      sourceConversationId: null,
      status: "APPROVED",
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
      updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    };

    familyChunkFindMany.mockResolvedValueOnce([baseChunk]);
    familyReviewFindMany.mockResolvedValueOnce([
      {
        familyChunkId: "chunk-1",
        nextReviewAt: new Date("2026-06-10T00:00:00.000Z"),
        intervalDays: 3,
        masteryScore: 55,
        reviewCount: 2,
        lastReviewedAt: null,
        lastCorrect: true,
      },
    ]);

    const deck = await buildFamilyPracticeDeckForUser({
      userId: "user-1",
      mode: "DAILY",
      now: new Date("2026-06-11T00:00:00.000Z"),
    });

    expect(deck.totalApprovedChunks).toBe(1);
    expect(deck.totalDue).toBe(1);
    expect(deck.exercises).toHaveLength(1);
    expect(deck.exercises[0].familyChunkId).toBe("chunk-1");
  });
});

describe("submitFamilyPracticeSession", () => {
  it("blocks non-approved family chunks", async () => {
    familyChunkFindMany.mockResolvedValueOnce([
      { id: "chunk-1", status: "SUGGESTED" },
    ]);

    await expect(
      submitFamilyPracticeSession({
        userId: "user-1",
        payload: {
          mode: "DAILY",
          answers: [
            {
              familyChunkId: "chunk-1",
              exerciseType: "VI_TO_CHUNK",
              prompt: "p",
              expectedAnswer: "Brush your teeth",
              userAnswer: "Brush your teeth",
              isCorrect: true,
              responseTimeMs: 5000,
              confidenceLevel: "EASY",
            },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects family chunks owned by other users", async () => {
    familyChunkFindMany.mockResolvedValueOnce([]);

    await expect(
      submitFamilyPracticeSession({
        userId: "user-1",
        payload: {
          mode: "DAILY",
          answers: [
            {
              familyChunkId: "chunk-99",
              exerciseType: "VI_TO_CHUNK",
              prompt: "p",
              expectedAnswer: "Brush your teeth",
              userAnswer: "Brush your teeth",
              isCorrect: true,
              responseTimeMs: 5000,
              confidenceLevel: "EASY",
            },
          ],
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(transaction).not.toHaveBeenCalled();
  });

  it("saves a session, answer, and family review schedule for approved chunks", async () => {
    familyChunkFindMany.mockResolvedValueOnce([
      { id: "chunk-1", status: "APPROVED" },
    ]);
    familyPracticeSessionCreate.mockResolvedValueOnce({ id: "session-1" });
    familyPracticeAnswerCreate.mockResolvedValueOnce({ id: "answer-1" });
    familyReviewFindUnique.mockResolvedValueOnce(null);
    familyReviewUpsert.mockResolvedValueOnce({ id: "review-1" });

    const result = await submitFamilyPracticeSession({
      userId: "user-1",
      payload: {
        mode: "DAILY",
        answers: [
          {
            familyChunkId: "chunk-1",
            exerciseType: "VI_TO_CHUNK",
            prompt: "Type the chunk",
            expectedAnswer: "Brush your teeth",
            userAnswer: "Brush your teeth",
            isCorrect: true,
            responseTimeMs: 5000,
            confidenceLevel: "EASY",
          },
        ],
      },
    });

    expect(result.sessionId).toBe("session-1");
    expect(result.summary).toMatchObject({
      totalQuestions: 1,
      correctAnswers: 1,
      accuracyRate: 100,
      score: 100,
    });
    expect(familyPracticeSessionCreate).toHaveBeenCalledTimes(1);
    expect(familyPracticeAnswerCreate).toHaveBeenCalledTimes(1);
    expect(familyReviewUpsert).toHaveBeenCalledTimes(1);
  });
});
