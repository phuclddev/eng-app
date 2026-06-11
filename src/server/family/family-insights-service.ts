import { FAMILY_INSIGHTS_WINDOW_DAYS } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  FamilyInsightsSnapshot,
  FamilyInsightsSummaryResponse,
} from "@/lib/types";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildFamilyWeeklyInsightsPrompt } from "@/server/ai/prompts/family-weekly-insights";
import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";
import { prisma } from "@/server/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}

function calculateStreak(completedDates: Date[], now: Date) {
  if (completedDates.length === 0) {
    return 0;
  }

  const unique = new Set(
    completedDates.map((date) => startOfDay(date).toISOString()),
  );

  let streak = 0;
  const today = startOfDay(now);

  for (let offset = 0; offset < 30; offset += 1) {
    const day = new Date(today.getTime() - offset * ONE_DAY_MS);
    if (unique.has(day.toISOString())) {
      streak += 1;
    } else if (offset === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

export async function buildFamilyInsightsSnapshot(input: {
  userId: string;
  now?: Date;
}): Promise<FamilyInsightsSnapshot> {
  const now = input.now ?? new Date();
  const cutoff = new Date(
    now.getTime() - FAMILY_INSIGHTS_WINDOW_DAYS * ONE_DAY_MS,
  );

  const [
    weeklyAnswers,
    weeklyConversations,
    weeklyRoleplays,
    sessionDates,
    weakReviews,
    strongestReviews,
  ] = await Promise.all([
    prisma.familyPracticeAnswer.findMany({
      where: {
        userId: input.userId,
        createdAt: { gte: cutoff },
      },
      select: {
        isCorrect: true,
        familyChunkId: true,
        familyChunk: {
          select: {
            id: true,
            text: true,
            meaningVi: true,
            scenarioCategory: true,
          },
        },
      },
    }),
    prisma.familyConversation.count({
      where: {
        userId: input.userId,
        createdAt: { gte: cutoff },
      },
    }),
    prisma.familyRoleplaySession.count({
      where: {
        userId: input.userId,
        createdAt: { gte: cutoff },
      },
    }),
    prisma.familyPracticeSession.findMany({
      where: {
        userId: input.userId,
        completedAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: 30,
      select: { completedAt: true },
    }),
    prisma.familyReviewSchedule.findMany({
      where: {
        userId: input.userId,
        masteryScore: { lt: 50 },
      },
      orderBy: { masteryScore: "asc" },
      take: 5,
      select: {
        familyChunkId: true,
        masteryScore: true,
        familyChunk: {
          select: { text: true, meaningVi: true },
        },
      },
    }),
    prisma.familyReviewSchedule.findMany({
      where: {
        userId: input.userId,
        masteryScore: { gte: 70 },
      },
      orderBy: { masteryScore: "desc" },
      take: 5,
      select: {
        familyChunkId: true,
        masteryScore: true,
        familyChunk: {
          select: { text: true, meaningVi: true },
        },
      },
    }),
  ]);

  const totalAnswers = weeklyAnswers.length;
  const totalCorrect = weeklyAnswers.filter((answer) => answer.isCorrect).length;
  const accuracyRate =
    totalAnswers === 0 ? 0 : Math.round((totalCorrect / totalAnswers) * 100);

  const chunkStats = new Map<
    string,
    {
      text: string;
      meaningVi: string;
      attempts: number;
      correct: number;
    }
  >();
  const scenarioStats = new Map<
    string,
    { attempts: number; correct: number }
  >();

  for (const answer of weeklyAnswers) {
    const chunk = answer.familyChunk;
    const bucket = chunkStats.get(answer.familyChunkId) ?? {
      text: chunk.text,
      meaningVi: chunk.meaningVi,
      attempts: 0,
      correct: 0,
    };
    bucket.attempts += 1;
    if (answer.isCorrect) {
      bucket.correct += 1;
    }
    chunkStats.set(answer.familyChunkId, bucket);

    const scenarioBucket = scenarioStats.get(chunk.scenarioCategory) ?? {
      attempts: 0,
      correct: 0,
    };
    scenarioBucket.attempts += 1;
    if (answer.isCorrect) {
      scenarioBucket.correct += 1;
    }
    scenarioStats.set(chunk.scenarioCategory, scenarioBucket);
  }

  const topPracticedChunks = [...chunkStats.entries()]
    .map(([chunkId, value]) => ({
      chunkId,
      text: value.text,
      meaningVi: value.meaningVi,
      attempts: value.attempts,
      accuracyRate:
        value.attempts === 0
          ? 0
          : Math.round((value.correct / value.attempts) * 100),
    }))
    .sort((left, right) => right.attempts - left.attempts)
    .slice(0, 5);

  const weakChunks = weakReviews.map((review) => ({
    chunkId: review.familyChunkId,
    text: review.familyChunk.text,
    meaningVi: review.familyChunk.meaningVi,
    masteryScore: review.masteryScore,
  }));

  const strongestChunks = strongestReviews.map((review) => ({
    chunkId: review.familyChunkId,
    text: review.familyChunk.text,
    meaningVi: review.familyChunk.meaningVi,
    masteryScore: review.masteryScore,
  }));

  const topScenarios = [...scenarioStats.entries()]
    .map(([scenarioCategory, value]) => ({
      scenarioCategory,
      attempts: value.attempts,
      accuracyRate:
        value.attempts === 0
          ? 0
          : Math.round((value.correct / value.attempts) * 100),
    }))
    .sort((left, right) => right.attempts - left.attempts)
    .slice(0, 5);

  const weeklyStreakDays = calculateStreak(
    sessionDates
      .map((session) => session.completedAt)
      .filter((value): value is Date => value !== null),
    now,
  );

  return {
    windowDays: FAMILY_INSIGHTS_WINDOW_DAYS,
    totalAnswers,
    totalCorrect,
    accuracyRate,
    weeklyStreakDays,
    conversationsGenerated: weeklyConversations,
    roleplaysStarted: weeklyRoleplays,
    topPracticedChunks,
    weakChunks,
    strongestChunks,
    topScenarios,
  };
}

export async function generateFamilyWeeklyInsightSummary(input: {
  userId: string;
  forceRefresh?: boolean;
  now?: Date;
}): Promise<FamilyInsightsSummaryResponse> {
  const snapshot = await buildFamilyInsightsSnapshot({
    userId: input.userId,
    now: input.now,
  });

  const profile = await getActiveFamilyProfileForUser({ userId: input.userId });
  const familySummary = profile
    ? buildCompactFamilyProfileSummary(profile.profileMarkdown)
    : "No active family profile. Stay warm and generic.";

  try {
    const result = await callAiTutor({
      query: buildFamilyWeeklyInsightsPrompt({
        familySummary,
        windowDays: snapshot.windowDays,
        totalAnswers: snapshot.totalAnswers,
        accuracyRate: snapshot.accuracyRate,
        weeklyStreakDays: snapshot.weeklyStreakDays,
        conversationsGenerated: snapshot.conversationsGenerated,
        roleplaysStarted: snapshot.roleplaysStarted,
        topPracticedChunkLines: snapshot.topPracticedChunks.map(
          (chunk) =>
            `**${chunk.text}** — ${chunk.meaningVi} (${chunk.attempts} attempts, ${chunk.accuracyRate}% accurate)`,
        ),
        weakChunkLines: snapshot.weakChunks.map(
          (chunk) =>
            `**${chunk.text}** — ${chunk.meaningVi} (mastery ${chunk.masteryScore}/100)`,
        ),
        strongestChunkLines: snapshot.strongestChunks.map(
          (chunk) =>
            `**${chunk.text}** — ${chunk.meaningVi} (mastery ${chunk.masteryScore}/100)`,
        ),
        topScenarioLines: snapshot.topScenarios.map(
          (scenario) =>
            `${scenario.scenarioCategory} (${scenario.attempts} attempts, ${scenario.accuracyRate}% accurate)`,
        ),
      }),
    });

    const answer = result.answer.trim();

    if (!answer) {
      throw new AppError(
        "AI returned an empty weekly insights summary.",
        502,
        "AI_TUTOR_INVALID_RESPONSE",
      );
    }

    return { answer, cached: false };
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family weekly insights AI call failed",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Weekly insights summary is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }
}
