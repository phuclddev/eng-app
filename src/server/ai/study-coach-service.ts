import { createHash } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { parseStructuredStudyCoach } from "@/lib/ai-tutor";
import type {
  AiStudyCoachSnapshotRecord,
  AiTutorStructuredFeedbackSection,
} from "@/lib/types";
import { getDashboardSnapshot, getProgressSnapshot } from "@/server/data/dashboard";
import { prisma } from "@/server/prisma";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import {
  buildStudyCoachPrompt,
  type StudyCoachProfile,
} from "@/server/ai/prompts/study-coach";

const STUDY_COACH_CACHE_HOURS = 12;

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function buildSourceHash(profile: StudyCoachProfile) {
  return createHash("sha1").update(JSON.stringify(profile)).digest("hex");
}

function mapSnapshot(snapshot: {
  id: string;
  answer: string;
  structuredPlan: Prisma.JsonValue | null;
  createdAt: Date;
  expiresAt: Date | null;
}): AiStudyCoachSnapshotRecord {
  return {
    id: snapshot.id,
    answer: snapshot.answer,
    sections: (snapshot.structuredPlan as AiTutorStructuredFeedbackSection[] | null) ?? null,
    generatedAt: snapshot.createdAt.toISOString(),
    expiresAt: snapshot.expiresAt?.toISOString() ?? null,
  };
}

async function buildStudyCoachProfile(userId: string): Promise<StudyCoachProfile> {
  const [dashboard, progress, recentAnswers] = await Promise.all([
    getDashboardSnapshot(userId),
    getProgressSnapshot(userId),
    prisma.practiceAnswer.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        chunk: {
          include: {
            topic: true,
          },
        },
      },
    }),
  ]);

  const weakTopicNames = dashboard.weakTopics.slice(0, 3).map((item) => item.topic);
  const suggestedPrompts = await prisma.ieltsQuestion.findMany({
    where:
      weakTopicNames.length > 0
        ? {
            OR: [
              {
                topic: {
                  in: weakTopicNames,
                },
              },
              {
                subTopic: {
                  in: weakTopicNames,
                },
              },
            ],
          }
        : undefined,
    orderBy: [{ taskType: "asc" }, { difficulty: "asc" }, { updatedAt: "desc" }],
    take: 3,
    select: {
      taskType: true,
      topic: true,
      prompt: true,
    },
  });

  const fallbackPrompts =
    suggestedPrompts.length > 0
      ? suggestedPrompts
      : await prisma.ieltsQuestion.findMany({
          orderBy: [{ taskType: "asc" }, { difficulty: "asc" }, { updatedAt: "desc" }],
          take: 3,
          select: {
            taskType: true,
            topic: true,
            prompt: true,
          },
        });

  return {
    dueReviews: dashboard.dueReviews,
    accuracyRate: dashboard.accuracyRate,
    masteryAverage: dashboard.masteryAverage,
    weakTopics: dashboard.weakTopics.slice(0, 3),
    lowAccuracyExerciseTypes: [...progress.byExerciseType]
      .sort((left, right) => left.accuracyRate - right.accuracyRate)
      .slice(0, 3)
      .map((item) => ({
        type: item.type,
        accuracyRate: item.accuracyRate,
        attempts: item.attempts,
      })),
    weakChunks: progress.weakChunks.slice(0, 5),
    recentPracticeSignals: recentAnswers.map((answer) => ({
      chunk: answer.chunk.chunk,
      topic: answer.chunk.topic?.name ?? null,
      exerciseType: answer.exerciseType,
      isCorrect: answer.isCorrect,
      confidence: answer.confidence,
    })),
    suggestedPrompts: fallbackPrompts.map((prompt) => ({
      taskType: prompt.taskType,
      topic: prompt.topic,
      prompt: prompt.prompt,
    })),
  };
}

export async function getAiStudyCoachSnapshot({
  userId,
  forceRefresh = false,
}: {
  userId: string;
  forceRefresh?: boolean;
}) {
  const profile = await buildStudyCoachProfile(userId);
  const sourceHash = buildSourceHash(profile);
  const now = new Date();

  if (!forceRefresh) {
    const existingSnapshot = await prisma.aiStudyCoachSnapshot.findFirst({
      where: {
        userId,
        sourceHash,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (existingSnapshot) {
      return mapSnapshot(existingSnapshot);
    }
  }

  const response = await callAiTutor({
    query: buildStudyCoachPrompt(profile),
  });
  const sections = parseStructuredStudyCoach(response.answer);
  const savedSnapshot = await prisma.aiStudyCoachSnapshot.create({
    data: {
      userId,
      sourceHash,
      answer: response.answer,
      structuredPlan: (sections ?? null) as Prisma.InputJsonValue,
      expiresAt: addHours(now, STUDY_COACH_CACHE_HOURS),
    },
  });

  return mapSnapshot(savedSnapshot);
}
