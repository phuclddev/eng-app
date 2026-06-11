import { createHash } from "node:crypto";

import { FAMILY_DAILY_PLAN_TTL_MS } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  FamilyChildFocus,
  FamilyDailyPlanRecord,
  FamilyTodayRecommendations,
} from "@/lib/types";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildFamilyDailyPlanPrompt } from "@/server/ai/prompts/family-daily-plan";
import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";
import { buildFamilyRecommendations } from "@/server/family/family-recommendation-service";
import { prisma } from "@/server/prisma";

type DailyPlanInput = {
  userId: string;
  childFocus?: FamilyChildFocus;
  forceRefresh?: boolean;
  now?: Date;
};

function buildSourceHash(input: {
  childFocus: FamilyChildFocus;
  recommendations: FamilyTodayRecommendations;
  date: string;
}) {
  const fingerprint = {
    date: input.date,
    childFocus: input.childFocus,
    due: input.recommendations.dueReviewCount,
    weak: input.recommendations.weakChunkCount,
    chunkIds: input.recommendations.recommendedChunks.map((chunk) => chunk.id),
    scenarioId: input.recommendations.recommendedScenario?.id ?? null,
    conversationId: input.recommendations.recommendedConversation?.id ?? null,
    roleplay: input.recommendations.recommendedRoleplay
      ? `${input.recommendations.recommendedRoleplay.userRole}:${input.recommendations.recommendedRoleplay.aiRole}`
      : null,
  };

  return createHash("sha1").update(JSON.stringify(fingerprint)).digest("hex");
}

function buildChunkLines(
  recommendations: FamilyTodayRecommendations,
): string[] {
  return recommendations.recommendedChunks.map(
    (chunk) =>
      `**${chunk.text}** — ${chunk.meaningVi} (${chunk.reason.toLowerCase()})`,
  );
}

function buildScenarioLine(
  recommendations: FamilyTodayRecommendations,
): string | null {
  if (!recommendations.recommendedScenario) {
    return null;
  }
  const scenario = recommendations.recommendedScenario;
  return `${scenario.title} · ${scenario.category} · ${scenario.childFocus.toLowerCase()} · difficulty ${scenario.difficulty}/5`;
}

function buildConversationLine(
  recommendations: FamilyTodayRecommendations,
): string | null {
  if (!recommendations.recommendedConversation) {
    return null;
  }
  return `${recommendations.recommendedConversation.title} (scenario: ${recommendations.recommendedConversation.scenarioTitle})`;
}

function buildRoleplayLine(
  recommendations: FamilyTodayRecommendations,
): string | null {
  if (!recommendations.recommendedRoleplay) {
    return null;
  }
  const roleplay = recommendations.recommendedRoleplay;
  return `You as ${roleplay.userRole}, AI as ${roleplay.aiRole}, focus ${roleplay.childFocus}`;
}

export async function getFamilyDailyPlanForUser(input: DailyPlanInput): Promise<{
  plan: FamilyDailyPlanRecord | null;
  recommendations: FamilyTodayRecommendations;
}> {
  const childFocus = input.childFocus ?? "BOTH";
  const now = input.now ?? new Date();

  const recommendations = await buildFamilyRecommendations({
    userId: input.userId,
    childFocus,
    now,
  });

  const dateKey = now.toISOString().slice(0, 10);
  const sourceHash = buildSourceHash({
    childFocus,
    recommendations,
    date: dateKey,
  });

  const existing = await prisma.familyDailyPlanSnapshot.findFirst({
    where: {
      userId: input.userId,
      childFocus,
      sourceHash,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (
    existing &&
    !input.forceRefresh &&
    (existing.expiresAt === null || existing.expiresAt.getTime() > now.getTime())
  ) {
    return {
      plan: {
        id: existing.id,
        childFocus: existing.childFocus,
        answer: existing.answer,
        generatedAt: existing.updatedAt.toISOString(),
        expiresAt: existing.expiresAt?.toISOString() ?? null,
        cached: true,
      },
      recommendations,
    };
  }

  return { plan: null, recommendations };
}

export async function generateFamilyDailyPlan(input: DailyPlanInput): Promise<{
  plan: FamilyDailyPlanRecord;
  recommendations: FamilyTodayRecommendations;
}> {
  const childFocus = input.childFocus ?? "BOTH";
  const now = input.now ?? new Date();

  const recommendations = await buildFamilyRecommendations({
    userId: input.userId,
    childFocus,
    now,
  });

  const dateKey = now.toISOString().slice(0, 10);
  const sourceHash = buildSourceHash({
    childFocus,
    recommendations,
    date: dateKey,
  });

  if (!input.forceRefresh) {
    const cached = await prisma.familyDailyPlanSnapshot.findFirst({
      where: {
        userId: input.userId,
        childFocus,
        sourceHash,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (
      cached &&
      (cached.expiresAt === null || cached.expiresAt.getTime() > now.getTime())
    ) {
      return {
        plan: {
          id: cached.id,
          childFocus: cached.childFocus,
          answer: cached.answer,
          generatedAt: cached.updatedAt.toISOString(),
          expiresAt: cached.expiresAt?.toISOString() ?? null,
          cached: true,
        },
        recommendations,
      };
    }
  }

  const profile = await getActiveFamilyProfileForUser({ userId: input.userId });
  const familySummary = profile
    ? buildCompactFamilyProfileSummary(profile.profileMarkdown)
    : "No active family profile is available. Stay warm and generic.";

  const recentConversations = await prisma.familyConversation.findMany({
    where: { userId: input.userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { title: true },
  });

  const recentRoleplays = await prisma.familyRoleplaySession.findMany({
    where: { userId: input.userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { userRole: true, aiRole: true, title: true },
  });

  let answer: string;

  try {
    const result = await callAiTutor({
      query: buildFamilyDailyPlanPrompt({
        familySummary,
        childFocus,
        dueReviewCount: recommendations.dueReviewCount,
        weakChunkCount: recommendations.weakChunkCount,
        approvedChunkCount: recommendations.approvedChunkCount,
        recommendedChunkLines: buildChunkLines(recommendations),
        recommendedScenarioLine: buildScenarioLine(recommendations),
        recommendedConversationLine: buildConversationLine(recommendations),
        recommendedRoleplayLine: buildRoleplayLine(recommendations),
        recentRoleplayLines: recentRoleplays.map(
          (session) =>
            `${session.title} (you ${session.userRole}, AI ${session.aiRole})`,
        ),
        recentConversationTitles: recentConversations.map(
          (conversation) => conversation.title,
        ),
      }),
    });
    answer = result.answer.trim();

    if (!answer) {
      throw new AppError(
        "AI returned an empty family daily plan.",
        502,
        "AI_TUTOR_INVALID_RESPONSE",
      );
    }
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        childFocus,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family daily plan AI call failed",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Family daily plan is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const expiresAt = new Date(now.getTime() + FAMILY_DAILY_PLAN_TTL_MS);

  const snapshot = await prisma.familyDailyPlanSnapshot.upsert({
    where: {
      id: `daily-${input.userId}-${childFocus}-${sourceHash}`.slice(0, 191),
    },
    create: {
      id: `daily-${input.userId}-${childFocus}-${sourceHash}`.slice(0, 191),
      userId: input.userId,
      childFocus,
      sourceHash,
      answer,
      expiresAt,
    },
    update: {
      answer,
      expiresAt,
    },
  });

  return {
    plan: {
      id: snapshot.id,
      childFocus: snapshot.childFocus,
      answer: snapshot.answer,
      generatedAt: snapshot.updatedAt.toISOString(),
      expiresAt: snapshot.expiresAt?.toISOString() ?? null,
      cached: false,
    },
    recommendations,
  };
}
