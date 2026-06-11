import type {
  FamilyDashboardSnapshot,
  FamilySpeakerRole,
} from "@/lib/types";
import { prisma } from "@/server/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const WEEKLY_WINDOW_MS = 7 * ONE_DAY_MS;
const STREAK_WINDOW_DAYS = 30;

function startOfDay(date: Date) {
  const cloned = new Date(date);
  cloned.setHours(0, 0, 0, 0);
  return cloned;
}

function calculateStreakFromDates(dates: Date[], now: Date) {
  if (dates.length === 0) {
    return 0;
  }

  const uniqueDays = new Set(
    dates.map((date) => startOfDay(date).toISOString()),
  );

  let streak = 0;
  const today = startOfDay(now);

  for (let offset = 0; offset < STREAK_WINDOW_DAYS; offset += 1) {
    const day = new Date(today.getTime() - offset * ONE_DAY_MS);

    if (uniqueDays.has(day.toISOString())) {
      streak += 1;
    } else if (offset === 0) {
      continue;
    } else {
      break;
    }
  }

  return streak;
}

export async function buildFamilyDashboardSnapshot(input: {
  userId: string;
  now?: Date;
}): Promise<FamilyDashboardSnapshot> {
  const now = input.now ?? new Date();
  const weeklyCutoff = new Date(now.getTime() - WEEKLY_WINDOW_MS);

  const [
    totalApprovedChunks,
    chunksLearned,
    dueReviews,
    weeklyAnswers,
    sessionDates,
    totalSessions,
    recentSessions,
  ] = await Promise.all([
    prisma.familyChunk.count({
      where: {
        userId: input.userId,
        status: "APPROVED",
      },
    }),
    prisma.familyReviewSchedule.count({
      where: {
        userId: input.userId,
        masteryScore: { gte: 60 },
      },
    }),
    prisma.familyReviewSchedule.count({
      where: {
        userId: input.userId,
        nextReviewAt: { lte: now },
      },
    }),
    prisma.familyPracticeAnswer.findMany({
      where: {
        userId: input.userId,
        createdAt: { gte: weeklyCutoff },
      },
      select: {
        isCorrect: true,
        familyChunk: {
          select: {
            scenarioCategory: true,
            speakerRole: true,
          },
        },
      },
    }),
    prisma.familyPracticeSession.findMany({
      where: {
        userId: input.userId,
        completedAt: { not: null },
      },
      select: {
        completedAt: true,
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 60,
    }),
    prisma.familyPracticeSession.count({
      where: {
        userId: input.userId,
      },
    }),
    prisma.familyPracticeSession.findMany({
      where: {
        userId: input.userId,
        completedAt: { not: null },
      },
      orderBy: {
        completedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        mode: true,
        totalQuestions: true,
        correctAnswers: true,
        score: true,
        completedAt: true,
      },
    }),
  ]);

  const totalWeekly = weeklyAnswers.length;
  const correctWeekly = weeklyAnswers.filter((answer) => answer.isCorrect).length;
  const weeklyAccuracy =
    totalWeekly === 0 ? 0 : Math.round((correctWeekly / totalWeekly) * 100);

  const scenarioStats = new Map<
    string,
    { attempts: number; correct: number }
  >();
  const speakerStats = new Map<
    FamilySpeakerRole,
    { attempts: number; correct: number }
  >();

  for (const answer of weeklyAnswers) {
    const scenario = answer.familyChunk.scenarioCategory;
    const scenarioBucket = scenarioStats.get(scenario) ?? {
      attempts: 0,
      correct: 0,
    };
    scenarioBucket.attempts += 1;

    if (answer.isCorrect) {
      scenarioBucket.correct += 1;
    }

    scenarioStats.set(scenario, scenarioBucket);

    const speaker = answer.familyChunk.speakerRole as FamilySpeakerRole;
    const speakerBucket = speakerStats.get(speaker) ?? {
      attempts: 0,
      correct: 0,
    };
    speakerBucket.attempts += 1;

    if (answer.isCorrect) {
      speakerBucket.correct += 1;
    }

    speakerStats.set(speaker, speakerBucket);
  }

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

  const topSpeakerRoles = [...speakerStats.entries()]
    .map(([speakerRole, value]) => ({
      speakerRole,
      attempts: value.attempts,
      accuracyRate:
        value.attempts === 0
          ? 0
          : Math.round((value.correct / value.attempts) * 100),
    }))
    .sort((left, right) => right.attempts - left.attempts)
    .slice(0, 5);

  const familyStreakDays = calculateStreakFromDates(
    sessionDates
      .map((session) => session.completedAt)
      .filter((value): value is Date => value !== null),
    now,
  );

  const recentActivity = recentSessions.map((session) => ({
    id: session.id,
    label: `${session.mode} practice · ${session.correctAnswers}/${session.totalQuestions}`,
    detail: `Score ${session.score}%`,
    createdAt: (session.completedAt ?? new Date()).toISOString(),
  }));

  return {
    totalApprovedChunks,
    chunksLearned,
    dueReviews,
    weeklyAccuracy,
    familyStreakDays,
    totalSessions,
    topScenarios,
    topSpeakerRoles,
    recentActivity,
  };
}
