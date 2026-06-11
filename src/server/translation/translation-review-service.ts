import { NotFoundError } from "@/lib/errors";
import type {
  TranslationRecallConfidence,
  TranslationSentenceRecord,
} from "@/lib/types";
import type { TranslationReviewPayload } from "@/lib/validation";
import { prisma } from "@/server/prisma";

export async function recordTranslationReview(input: {
  userId: string;
  payload: TranslationReviewPayload;
}): Promise<TranslationSentenceRecord> {
  const sentence = await prisma.translationSentence.findUnique({
    where: { id: input.payload.sentenceId },
    select: { id: true },
  });

  if (!sentence) {
    throw new NotFoundError("Translation sentence was not found.");
  }

  const reviewedAt = new Date();
  const confidence: TranslationRecallConfidence = input.payload.confidence;

  const existing = await prisma.translationSentenceReview.findUnique({
    where: {
      userId_sentenceId: {
        userId: input.userId,
        sentenceId: input.payload.sentenceId,
      },
    },
  });

  const counts = {
    easyCount: (existing?.easyCount ?? 0) + (confidence === "EASY" ? 1 : 0),
    mediumCount:
      (existing?.mediumCount ?? 0) + (confidence === "MEDIUM" ? 1 : 0),
    hardCount: (existing?.hardCount ?? 0) + (confidence === "HARD" ? 1 : 0),
  };

  await prisma.translationSentenceReview.upsert({
    where: {
      userId_sentenceId: {
        userId: input.userId,
        sentenceId: input.payload.sentenceId,
      },
    },
    create: {
      userId: input.userId,
      sentenceId: input.payload.sentenceId,
      reviewCount: 1,
      lastReviewedAt: reviewedAt,
      lastConfidence: confidence,
      ...counts,
    },
    update: {
      reviewCount: (existing?.reviewCount ?? 0) + 1,
      lastReviewedAt: reviewedAt,
      lastConfidence: confidence,
      ...counts,
    },
  });

  const refreshed = await prisma.translationSentence.findUnique({
    where: { id: input.payload.sentenceId },
    include: {
      reviews: {
        where: { userId: input.userId },
      },
      chunkMappings: {
        select: {
          id: true,
          englishPhrase: true,
          chunkId: true,
        },
      },
    },
  });

  if (!refreshed) {
    throw new NotFoundError("Translation sentence was not found.");
  }

  const review = refreshed.reviews[0];

  return {
    id: refreshed.id,
    orderIndex: refreshed.orderIndex,
    englishText: refreshed.englishText,
    vietnameseText: refreshed.vietnameseText,
    notes: refreshed.notes,
    review: review
      ? {
          reviewCount: review.reviewCount,
          lastConfidence: review.lastConfidence,
          easyCount: review.easyCount,
          mediumCount: review.mediumCount,
          hardCount: review.hardCount,
          lastReviewedAt: review.lastReviewedAt?.toISOString() ?? null,
        }
      : null,
    savedChunks: refreshed.chunkMappings.map((mapping) => ({
      id: mapping.id,
      englishPhrase: mapping.englishPhrase,
      chunkId: mapping.chunkId,
    })),
  };
}
