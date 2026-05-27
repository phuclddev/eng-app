import { NextResponse } from "next/server";

import { buildPracticeSummary } from "@/lib/practice";
import { calculateReviewUpdate } from "@/lib/spaced-repetition";
import { getErrorResponse } from "@/lib/errors";
import { practiceSubmissionSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { requireApprovedApiSession } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function POST(request: Request) {
  try {
    const session = await requireApprovedApiSession();
    const payload = practiceSubmissionSchema.parse(await request.json());
    const summary = buildPracticeSummary(payload.answers);
    const startedAt = payload.startedAt ? new Date(payload.startedAt) : new Date();
    const completedAt = new Date();

    await prisma.$transaction(async (tx) => {
      const practiceSession = await tx.practiceSession.create({
        data: {
          userId: session.user.id,
          mode: payload.mode,
          exerciseTypes: payload.answers.map((answer) => answer.exerciseType),
          totalQuestions: summary.totalQuestions,
          correctAnswers: summary.correctAnswers,
          averageResponseMs: summary.averageResponseMs,
          startedAt,
          completedAt,
        },
      });

      for (const answer of payload.answers) {
        await tx.practiceAnswer.create({
          data: {
            sessionId: practiceSession.id,
            userId: session.user.id,
            chunkId: answer.chunkId,
            exerciseType: answer.exerciseType,
            prompt: answer.prompt,
            expectedAnswer: answer.expectedAnswer,
            userAnswer: answer.userAnswer,
            isCorrect: answer.isCorrect,
            responseMs: answer.responseMs,
            confidence: answer.confidence,
            feedback: answer.feedback,
          },
        });

        const existingSchedule = await tx.reviewSchedule.findUnique({
          where: {
            userId_chunkId: {
              userId: session.user.id,
              chunkId: answer.chunkId,
            },
          },
        });

        const nextReview = calculateReviewUpdate({
          wasCorrect: answer.isCorrect,
          confidence: answer.confidence,
          responseMs: answer.responseMs,
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
            answer.responseMs) /
            totalAttempts,
        );

        await tx.reviewSchedule.upsert({
          where: {
            userId_chunkId: {
              userId: session.user.id,
              chunkId: answer.chunkId,
            },
          },
          create: {
            userId: session.user.id,
            chunkId: answer.chunkId,
            nextReviewAt: nextReview.nextReviewAt,
            lastReviewedAt: completedAt,
            intervalDays: nextReview.intervalDays,
            easeFactor: nextReview.easeFactor,
            reviewCount: 1,
            lastConfidence: answer.confidence,
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
            lastConfidence: answer.confidence,
            lastCorrect: answer.isCorrect,
            masteryScore: nextReview.masteryScore,
            totalAttempts,
            correctAttempts,
            averageResponseMs,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    logger.error({ error }, "Failed to submit practice session");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
