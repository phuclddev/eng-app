import type {
  FamilyChildFocus,
  FamilyRecommendedChunk,
  FamilyRecommendedConversation,
  FamilyRecommendedRoleplay,
  FamilyRecommendedScenario,
  FamilyRoleplayRole,
  FamilyTodayRecommendations,
} from "@/lib/types";
import { prisma } from "@/server/prisma";

const RECENT_USAGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RECOMMENDED_CHUNKS = 8;

type ChunkRow = {
  id: string;
  text: string;
  meaningVi: string;
  exampleSentence: string | null;
  childFocus: FamilyRecommendedChunk["childFocus"];
  speakerRole: FamilyRecommendedChunk["speakerRole"];
  scenarioCategory: string;
  personalizationScore: number;
  frequencyScore: number;
};

type ReviewRow = {
  familyChunkId: string;
  nextReviewAt: Date;
  masteryScore: number;
};

function matchesChildFocus(
  target: FamilyChildFocus | FamilyRecommendedChunk["childFocus"],
  focus: FamilyChildFocus,
): boolean {
  if (focus === "BOTH" || target === "BOTH") {
    return true;
  }

  if (target === "GENERAL") {
    return true;
  }

  return target === focus;
}

function chunkReason(input: {
  due: boolean;
  weak: boolean;
  personalized: boolean;
}): FamilyRecommendedChunk["reason"] {
  if (input.due) {
    return "DUE";
  }
  if (input.weak) {
    return "WEAK";
  }
  if (input.personalized) {
    return "PERSONALIZED";
  }
  return "FRESH";
}

function scoreChunk(input: {
  chunk: ChunkRow;
  review: ReviewRow | undefined;
  now: Date;
}): number {
  let score = 0;
  const { chunk, review, now } = input;

  if (review) {
    if (review.nextReviewAt.getTime() <= now.getTime()) {
      score += 120;
    }
    if (review.masteryScore < 40) {
      score += 30;
    } else if (review.masteryScore < 65) {
      score += 12;
    } else if (review.masteryScore >= 90) {
      score -= 30;
    }
  } else {
    score += 14;
  }

  score += chunk.personalizationScore * 9;
  score += chunk.frequencyScore * 4;

  return score;
}

function pickRecommendedScenario(input: {
  scenarios: Array<{
    id: string;
    title: string;
    category: string;
    childFocus: FamilyChildFocus;
    description: string;
    difficulty: number;
  }>;
  recentScenarioIds: Set<string>;
  childFocus: FamilyChildFocus;
}): FamilyRecommendedScenario | null {
  const focused = input.scenarios.filter((scenario) =>
    matchesChildFocus(scenario.childFocus, input.childFocus),
  );
  const candidates = focused.length > 0 ? focused : input.scenarios;

  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((left, right) => {
    const leftRecent = input.recentScenarioIds.has(left.id) ? 1 : 0;
    const rightRecent = input.recentScenarioIds.has(right.id) ? 1 : 0;

    if (leftRecent !== rightRecent) {
      return leftRecent - rightRecent;
    }

    return left.title.localeCompare(right.title);
  });

  const winner = sorted[0];
  const isFresh = !input.recentScenarioIds.has(winner.id);

  return {
    id: winner.id,
    title: winner.title,
    category: winner.category,
    childFocus: winner.childFocus,
    description: winner.description,
    difficulty: winner.difficulty,
    reason: isFresh
      ? "FRESH"
      : input.childFocus !== "BOTH"
        ? "CHILD_FOCUS"
        : "FREQUENT",
  };
}

function pickRecommendedRoleplay(input: {
  childFocus: FamilyChildFocus;
  recentRoleplayPairs: Set<string>;
  scenario: FamilyRecommendedScenario | null;
}): FamilyRecommendedRoleplay {
  const userRole: FamilyRoleplayRole = "FATHER";
  let aiRole: FamilyRoleplayRole;

  if (input.childFocus === "VIVI") {
    aiRole = "VIVI";
  } else if (input.childFocus === "KIWI") {
    aiRole = "KIWI";
  } else {
    aiRole = input.recentRoleplayPairs.has(`${userRole}:KIWI`) ? "VIVI" : "KIWI";
  }

  return {
    userRole,
    aiRole,
    childFocus: input.childFocus,
    reason:
      input.childFocus === "BOTH"
        ? `Alternate between Kiwi and Vivi — try ${aiRole === "KIWI" ? "Kiwi" : "Vivi"} today.`
        : `Focus on ${aiRole === "KIWI" ? "Kiwi" : "Vivi"} today.`,
    scenarioId: input.scenario?.id ?? null,
    scenarioTitle: input.scenario?.title ?? null,
  };
}

export async function buildFamilyRecommendations(input: {
  userId: string;
  childFocus?: FamilyChildFocus;
  now?: Date;
}): Promise<FamilyTodayRecommendations> {
  const childFocus = input.childFocus ?? "BOTH";
  const now = input.now ?? new Date();
  const recentCutoff = new Date(now.getTime() - RECENT_USAGE_WINDOW_MS);

  const [chunks, reviews, scenarios, recentConversations, recentRoleplays, latestConversation] =
    await Promise.all([
      prisma.familyChunk.findMany({
        where: { userId: input.userId, status: "APPROVED" },
        select: {
          id: true,
          text: true,
          meaningVi: true,
          exampleSentence: true,
          childFocus: true,
          speakerRole: true,
          scenarioCategory: true,
          personalizationScore: true,
          frequencyScore: true,
        },
      }),
      prisma.familyReviewSchedule.findMany({
        where: { userId: input.userId },
        select: {
          familyChunkId: true,
          nextReviewAt: true,
          masteryScore: true,
        },
      }),
      prisma.familyScenario.findMany({
        where: { userId: input.userId, isActive: true },
        select: {
          id: true,
          title: true,
          category: true,
          childFocus: true,
          description: true,
          difficulty: true,
        },
      }),
      prisma.familyConversation.findMany({
        where: {
          userId: input.userId,
          updatedAt: { gte: recentCutoff },
        },
        select: { scenarioId: true },
      }),
      prisma.familyRoleplaySession.findMany({
        where: {
          userId: input.userId,
          updatedAt: { gte: recentCutoff },
        },
        select: { userRole: true, aiRole: true, scenarioId: true },
      }),
      prisma.familyConversation.findFirst({
        where: { userId: input.userId },
        orderBy: { updatedAt: "desc" },
        include: {
          scenario: { select: { title: true } },
        },
      }),
    ]);

  const filteredChunks = chunks.filter((chunk) =>
    matchesChildFocus(chunk.childFocus, childFocus),
  );
  const reviewByChunk = new Map(reviews.map((review) => [review.familyChunkId, review]));

  const scored = filteredChunks
    .map((chunk) => {
      const review = reviewByChunk.get(chunk.id);
      const due = review ? review.nextReviewAt.getTime() <= now.getTime() : false;
      const weak = review ? review.masteryScore < 50 : true;

      return {
        chunk,
        review,
        score: scoreChunk({ chunk, review, now }),
        due,
        weak,
      };
    })
    .sort((left, right) => {
      const diff = right.score - left.score;
      if (diff !== 0) {
        return diff;
      }
      return left.chunk.id.localeCompare(right.chunk.id);
    });

  const recommendedChunks: FamilyRecommendedChunk[] = scored
    .slice(0, MAX_RECOMMENDED_CHUNKS)
    .map(({ chunk, review, due, weak }) => ({
      id: chunk.id,
      text: chunk.text,
      meaningVi: chunk.meaningVi,
      exampleSentence: chunk.exampleSentence,
      childFocus: chunk.childFocus,
      speakerRole: chunk.speakerRole,
      scenarioCategory: chunk.scenarioCategory,
      personalizationScore: chunk.personalizationScore,
      frequencyScore: chunk.frequencyScore,
      masteryScore: review?.masteryScore ?? null,
      nextReviewAt: review?.nextReviewAt.toISOString() ?? null,
      reason: chunkReason({
        due,
        weak,
        personalized: chunk.personalizationScore >= 4,
      }),
    }));

  const dueReviewCount = scored.filter((item) => item.due).length;
  const weakChunkCount = scored.filter(
    (item) => item.weak && !item.due,
  ).length;
  const approvedChunkCount = filteredChunks.length;

  const recentScenarioIds = new Set(
    recentConversations
      .map((conversation) => conversation.scenarioId)
      .filter((value): value is string => Boolean(value)),
  );

  const recommendedScenario = pickRecommendedScenario({
    scenarios,
    recentScenarioIds,
    childFocus,
  });

  const recommendedConversation: FamilyRecommendedConversation | null =
    latestConversation
      ? {
          id: latestConversation.id,
          title: latestConversation.title,
          scenarioTitle: latestConversation.scenario.title,
          childFocus: latestConversation.childFocus,
          updatedAt: latestConversation.updatedAt.toISOString(),
        }
      : null;

  const recentRoleplayPairs = new Set(
    recentRoleplays.map((session) => `${session.userRole}:${session.aiRole}`),
  );

  const recommendedRoleplay = pickRecommendedRoleplay({
    childFocus,
    recentRoleplayPairs,
    scenario: recommendedScenario,
  });

  return {
    childFocus,
    generatedAt: now.toISOString(),
    dueReviewCount,
    weakChunkCount,
    approvedChunkCount,
    recommendedChunks,
    recommendedScenario,
    recommendedConversation,
    recommendedRoleplay,
  };
}
