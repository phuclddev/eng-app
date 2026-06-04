import type {
  DashboardSnapshot,
  ExerciseType,
  ProgressSnapshot,
} from "@/lib/types";
import { prisma } from "@/server/prisma";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildStreak(dates: Date[]) {
  const uniqueDays = new Set(
    dates.map((date) => startOfDay(date).toISOString().slice(0, 10)),
  );
  const today = startOfDay(new Date());
  let streak = 0;

  while (uniqueDays.has(today.toISOString().slice(0, 10))) {
    streak += 1;
    today.setDate(today.getDate() - 1);
  }

  return streak;
}

export async function getDashboardSnapshot(
  userId: string,
): Promise<DashboardSnapshot> {
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);

  const [
    totalChunks,
    dueReviews,
    totalAnswers,
    correctAnswers,
    reviewAggregate,
    recentAnswers,
    recentSessions,
  ] = await Promise.all([
    prisma.chunk.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.reviewSchedule.count({
      where: {
        userId,
        chunk: {
          deletedAt: null,
        },
        nextReviewAt: {
          lte: now,
        },
      },
    }),
    prisma.practiceAnswer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        chunk: {
          include: {
            topic: true,
          },
        },
      },
      take: 400,
    }),
    prisma.practiceAnswer.count({
      where: {
        userId,
        isCorrect: true,
      },
    }),
    prisma.reviewSchedule.aggregate({
      where: { userId },
      _avg: {
        masteryScore: true,
      },
    }),
    prisma.practiceAnswer.findMany({
      where: {
        userId,
        createdAt: {
          gte: lastWeek,
        },
      },
      select: {
        chunkId: true,
        createdAt: true,
      },
    }),
    prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const topicBuckets = new Map<
    string,
    {
      attempts: number;
      correct: number;
    }
  >();

  for (const answer of totalAnswers) {
    const topic = answer.chunk.topic?.name ?? "General";
    const current = topicBuckets.get(topic) ?? { attempts: 0, correct: 0 };
    current.attempts += 1;
    current.correct += answer.isCorrect ? 1 : 0;
    topicBuckets.set(topic, current);
  }

  const weakTopics = [...topicBuckets.entries()]
    .map(([topic, metrics]) => ({
      topic,
      attempts: metrics.attempts,
      accuracyRate:
        metrics.attempts === 0
          ? 0
          : Math.round((metrics.correct / metrics.attempts) * 100),
    }))
    .sort((left, right) => left.accuracyRate - right.accuracyRate)
    .slice(0, 5);

  return {
    totalChunks,
    dueReviews,
    accuracyRate:
      totalAnswers.length === 0
        ? 0
        : Math.round((correctAnswers / totalAnswers.length) * 100),
    currentStreak: buildStreak(totalAnswers.map((answer) => answer.createdAt)),
    masteryAverage: Math.round(reviewAggregate._avg.masteryScore ?? 0),
    learnedThisWeek: new Set(recentAnswers.map((answer) => answer.chunkId)).size,
    weakTopics,
    recentActivity: recentSessions.map((session) => ({
      id: session.id,
      label: session.mode,
      detail: `${session.correctAnswers}/${session.totalQuestions} correct`,
      createdAt: session.startedAt.toISOString(),
    })),
  };
}

export async function getProgressSnapshot(
  userId: string,
): Promise<ProgressSnapshot> {
  const [answers, weakSchedules] = await Promise.all([
    prisma.practiceAnswer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        chunk: {
          include: {
            topic: true,
          },
        },
      },
      take: 400,
    }),
    prisma.reviewSchedule.findMany({
      where: {
        userId,
        chunk: {
          deletedAt: null,
        },
      },
      orderBy: [{ masteryScore: "asc" }, { nextReviewAt: "asc" }],
      take: 8,
      include: {
        chunk: {
          include: {
            topic: true,
          },
        },
      },
    }),
  ]);

  const byExercise = new Map<
    ExerciseType,
    {
      attempts: number;
      correct: number;
    }
  >();
  const byTopic = new Map<
    string,
    {
      attempts: number;
      correct: number;
    }
  >();

  for (const answer of answers) {
    const exerciseMetrics = byExercise.get(answer.exerciseType) ?? {
      attempts: 0,
      correct: 0,
    };
    exerciseMetrics.attempts += 1;
    exerciseMetrics.correct += answer.isCorrect ? 1 : 0;
    byExercise.set(answer.exerciseType, exerciseMetrics);

    const topicName = answer.chunk.topic?.name ?? "General";
    const topicMetrics = byTopic.get(topicName) ?? { attempts: 0, correct: 0 };
    topicMetrics.attempts += 1;
    topicMetrics.correct += answer.isCorrect ? 1 : 0;
    byTopic.set(topicName, topicMetrics);
  }

  return {
    byExerciseType: [...byExercise.entries()].map(([type, metrics]) => ({
      type,
      attempts: metrics.attempts,
      accuracyRate:
        metrics.attempts === 0
          ? 0
          : Math.round((metrics.correct / metrics.attempts) * 100),
    })),
    byTopic: [...byTopic.entries()]
      .map(([topic, metrics]) => ({
        topic,
        attempts: metrics.attempts,
        accuracyRate:
          metrics.attempts === 0
            ? 0
            : Math.round((metrics.correct / metrics.attempts) * 100),
      }))
      .sort((left, right) => left.accuracyRate - right.accuracyRate),
    weakChunks: weakSchedules.map((schedule) => ({
      chunk: schedule.chunk.chunk,
      topic: schedule.chunk.topic?.name ?? null,
      masteryScore: schedule.masteryScore,
      nextReviewAt: schedule.nextReviewAt.toISOString(),
    })),
  };
}
