import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  buildFamilyPracticeDeck,
  buildFamilyPracticeSummary,
  type FamilyPracticeChunkRecord,
} from "@/lib/family-practice";
import { calculateFamilyReviewUpdate } from "@/lib/family-spaced-repetition";
import type {
  FamilyChunkRecord,
  FamilyPracticeDeck,
  FamilyPracticeMode,
  FamilyPracticeSummary,
  FamilyReviewSnapshot,
} from "@/lib/types";
import type { FamilyPracticeSubmissionPayload } from "@/lib/validation";
import { prisma } from "@/server/prisma";

type FamilyChunkRow = {
  id: string;
  userId: string;
  text: string;
  meaningVi: string;
  usageContext: string;
  speakerRole: FamilyChunkRecord["speakerRole"];
  childFocus: FamilyChunkRecord["childFocus"];
  scenarioCategory: string;
  difficulty: number;
  frequencyScore: number;
  personalizationScore: number;
  exampleSentence: string | null;
  notes: string | null;
  sourceConversationId: string | null;
  status: FamilyChunkRecord["status"];
  createdAt: Date;
  updatedAt: Date;
};

type FamilyReviewRow = {
  familyChunkId: string;
  nextReviewAt: Date;
  intervalDays: number;
  masteryScore: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
  lastCorrect: boolean | null;
};

function toReviewSnapshot(
  review: FamilyReviewRow | null | undefined,
): FamilyReviewSnapshot | null {
  if (!review) {
    return null;
  }

  return {
    nextReviewAt: review.nextReviewAt.toISOString(),
    intervalDays: review.intervalDays,
    masteryScore: review.masteryScore,
    reviewCount: review.reviewCount,
    lastReviewedAt: review.lastReviewedAt?.toISOString() ?? null,
    lastCorrect: review.lastCorrect,
  };
}

function toChunkRecord(
  chunk: FamilyChunkRow,
  review: FamilyReviewRow | null | undefined,
): FamilyPracticeChunkRecord {
  return {
    id: chunk.id,
    userId: chunk.userId,
    text: chunk.text,
    meaningVi: chunk.meaningVi,
    usageContext: chunk.usageContext,
    speakerRole: chunk.speakerRole,
    childFocus: chunk.childFocus,
    scenarioCategory: chunk.scenarioCategory,
    difficulty: chunk.difficulty,
    frequencyScore: chunk.frequencyScore,
    personalizationScore: chunk.personalizationScore,
    exampleSentence: chunk.exampleSentence,
    notes: chunk.notes,
    sourceConversationId: chunk.sourceConversationId,
    status: chunk.status,
    createdAt: chunk.createdAt.toISOString(),
    updatedAt: chunk.updatedAt.toISOString(),
    review: toReviewSnapshot(review),
  };
}

async function loadApprovedChunksWithReviews(input: { userId: string }) {
  const approvedChunks = (await prisma.familyChunk.findMany({
    where: {
      userId: input.userId,
      status: "APPROVED",
    },
  })) as FamilyChunkRow[];

  if (approvedChunks.length === 0) {
    return [];
  }

  const reviews = (await prisma.familyReviewSchedule.findMany({
    where: {
      userId: input.userId,
      familyChunkId: {
        in: approvedChunks.map((chunk) => chunk.id),
      },
    },
  })) as FamilyReviewRow[];

  const reviewByChunk = new Map(
    reviews.map((review) => [review.familyChunkId, review]),
  );

  return approvedChunks.map((chunk) =>
    toChunkRecord(chunk, reviewByChunk.get(chunk.id)),
  );
}

function filterByMode(
  chunks: FamilyPracticeChunkRecord[],
  mode: FamilyPracticeMode,
  now: Date,
) {
  if (mode === "REVIEW") {
    return chunks.filter((chunk) => {
      if (!chunk.review) {
        return false;
      }

      return new Date(chunk.review.nextReviewAt).getTime() <= now.getTime();
    });
  }

  return chunks;
}

export async function buildFamilyPracticeDeckForUser(input: {
  userId: string;
  mode: FamilyPracticeMode;
  maxItems?: number;
  now?: Date;
}): Promise<FamilyPracticeDeck> {
  const now = input.now ?? new Date();
  const chunks = await loadApprovedChunksWithReviews({ userId: input.userId });

  const totalDue = chunks.filter((chunk) => {
    if (!chunk.review) {
      return false;
    }

    return new Date(chunk.review.nextReviewAt).getTime() <= now.getTime();
  }).length;

  const filtered = filterByMode(chunks, input.mode, now);

  const exercises = buildFamilyPracticeDeck({
    chunks: filtered,
    mode: input.mode,
    maxItems: input.maxItems,
    now,
  });

  return {
    mode: input.mode,
    exercises,
    totalDue,
    totalApprovedChunks: chunks.length,
  };
}

export async function submitFamilyPracticeSession(input: {
  userId: string;
  payload: FamilyPracticeSubmissionPayload;
}): Promise<{
  sessionId: string;
  summary: FamilyPracticeSummary;
}> {
  const { payload, userId } = input;
  const summary = buildFamilyPracticeSummary(payload.answers);
  const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date();
  const completedAt = new Date();

  const chunkIds = [...new Set(payload.answers.map((answer) => answer.familyChunkId))];

  if (chunkIds.length === 0) {
    throw new ValidationError("At least one family chunk answer is required.");
  }

  const ownedChunks = await prisma.familyChunk.findMany({
    where: {
      id: { in: chunkIds },
      userId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (ownedChunks.length !== chunkIds.length) {
    throw new NotFoundError("One or more family chunks were not found.");
  }

  const nonApproved = ownedChunks.filter((chunk) => chunk.status !== "APPROVED");

  if (nonApproved.length > 0) {
    throw new ValidationError(
      "Family practice only accepts approved family chunks.",
    );
  }

  const sessionId = await prisma.$transaction(async (tx) => {
    const session = await tx.familyPracticeSession.create({
      data: {
        userId,
        mode: payload.mode,
        exerciseTypes: payload.answers.map((answer) => answer.exerciseType),
        totalQuestions: summary.totalQuestions,
        correctAnswers: summary.correctAnswers,
        score: summary.score,
        averageResponseMs: summary.averageResponseMs,
        startedAt,
        completedAt,
      },
    });

    for (const answer of payload.answers) {
      await tx.familyPracticeAnswer.create({
        data: {
          sessionId: session.id,
          userId,
          familyChunkId: answer.familyChunkId,
          exerciseType: answer.exerciseType,
          prompt: answer.prompt,
          expectedAnswer: answer.expectedAnswer,
          userAnswer: answer.userAnswer,
          isCorrect: answer.isCorrect,
          responseTimeMs: answer.responseTimeMs,
          confidenceLevel: answer.confidenceLevel,
          feedback: answer.feedback,
        },
      });

      const existingSchedule = await tx.familyReviewSchedule.findUnique({
        where: {
          userId_familyChunkId: {
            userId,
            familyChunkId: answer.familyChunkId,
          },
        },
      });

      const nextReview = calculateFamilyReviewUpdate({
        wasCorrect: answer.isCorrect,
        confidence: answer.confidenceLevel,
        responseTimeMs: answer.responseTimeMs,
        reviewCount: existingSchedule?.reviewCount ?? 0,
        currentIntervalDays: existingSchedule?.intervalDays,
        currentEaseFactor: existingSchedule?.easeFactor,
        currentMasteryScore: existingSchedule?.masteryScore,
      });

      const totalAttempts = (existingSchedule?.totalAttempts ?? 0) + 1;
      const correctAttempts =
        (existingSchedule?.correctAttempts ?? 0) + (answer.isCorrect ? 1 : 0);
      const averageResponseMs = Math.round(
        ((existingSchedule?.averageResponseMs ?? 0) *
          (existingSchedule?.totalAttempts ?? 0) +
          answer.responseTimeMs) /
          totalAttempts,
      );

      await tx.familyReviewSchedule.upsert({
        where: {
          userId_familyChunkId: {
            userId,
            familyChunkId: answer.familyChunkId,
          },
        },
        create: {
          userId,
          familyChunkId: answer.familyChunkId,
          nextReviewAt: nextReview.nextReviewAt,
          lastReviewedAt: completedAt,
          intervalDays: nextReview.intervalDays,
          easeFactor: nextReview.easeFactor,
          reviewCount: 1,
          lastConfidence: answer.confidenceLevel,
          lastCorrect: answer.isCorrect,
          masteryScore: nextReview.masteryScore,
          totalAttempts,
          correctAttempts,
          averageResponseMs,
        },
        update: {
          nextReviewAt: nextReview.nextReviewAt,
          lastReviewedAt: completedAt,
          intervalDays: nextReview.intervalDays,
          easeFactor: nextReview.easeFactor,
          reviewCount: (existingSchedule?.reviewCount ?? 0) + 1,
          lastConfidence: answer.confidenceLevel,
          lastCorrect: answer.isCorrect,
          masteryScore: nextReview.masteryScore,
          totalAttempts,
          correctAttempts,
          averageResponseMs,
        },
      });
    }

    return session.id;
  });

  return {
    sessionId,
    summary,
  };
}
