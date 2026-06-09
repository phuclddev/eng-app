import { AppError, NotFoundError } from "@/lib/errors";
import type {
  FamilyConversationGenerationPayload,
} from "@/lib/validation";
import type {
  FamilyConversationLength,
  FamilyConversationRecord,
  FamilyScenarioRecord,
  FamilyTargetLevel,
} from "@/lib/types";
import { logger } from "@/lib/logger";
import { formatDateTime } from "@/lib/utils";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildFamilyConversationPrompt } from "@/server/ai/prompts/family-conversation";
import { prisma } from "@/server/prisma";

import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";
import { getFamilyScenarioByIdForUser } from "@/server/family/family-scenario-service";

type FamilyConversationModel = {
  id: string;
  userId: string;
  scenarioId: string;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  title: string;
  conversationMarkdown: string;
  aiConversationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  scenario: {
    id: string;
    title: string;
    category: string;
  };
};

function mapFamilyConversation(
  conversation: FamilyConversationModel,
): FamilyConversationRecord {
  return {
    id: conversation.id,
    userId: conversation.userId,
    scenarioId: conversation.scenarioId,
    childFocus: conversation.childFocus,
    title: conversation.title,
    conversationMarkdown: conversation.conversationMarkdown,
    aiConversationId: conversation.aiConversationId,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    scenario: {
      id: conversation.scenario.id,
      title: conversation.scenario.title,
      category: conversation.scenario.category,
    },
  };
}

function buildConversationTitle(input: {
  childFocus: FamilyConversationGenerationPayload["childFocus"];
  scenario: FamilyScenarioRecord;
}) {
  const suffix =
    input.childFocus === "BOTH"
      ? "Kiwi & Vivi"
      : input.childFocus === "KIWI"
        ? "Kiwi"
        : "Vivi";

  return `${input.scenario.title} · ${suffix}`;
}

function ensureConversationMarkdown(answer: string) {
  const markdown = answer.trim();

  if (!markdown) {
    throw new AppError(
      "AI returned an empty family conversation.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  return markdown;
}

export async function listFamilyConversations(input: {
  childFocus?: "BOTH" | "KIWI" | "VIVI";
  scenarioId?: string;
  userId: string;
}) {
  const conversations = await prisma.familyConversation.findMany({
    where: {
      userId: input.userId,
      ...(input.scenarioId ? { scenarioId: input.scenarioId } : {}),
      ...(input.childFocus ? { childFocus: input.childFocus } : {}),
    },
    include: {
      scenario: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return conversations.map(mapFamilyConversation);
}

export async function getFamilyConversationSummary(input: {
  userId: string;
}) {
  const totalConversations = await prisma.familyConversation.count({
    where: {
      userId: input.userId,
    },
  });

  return {
    hasGenerationFlow: true,
    totalConversations,
  };
}

export async function deleteFamilyConversationForUser(input: {
  conversationId: string;
  userId: string;
}) {
  const existing = await prisma.familyConversation.findFirst({
    where: {
      id: input.conversationId,
      userId: input.userId,
    },
    include: {
      scenario: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
    },
  });

  if (!existing) {
    throw new NotFoundError("Family conversation was not found.");
  }

  const deleted = await prisma.familyConversation.delete({
    where: {
      id: input.conversationId,
    },
    include: {
      scenario: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
    },
  });

  return mapFamilyConversation(deleted);
}

export async function generateFamilyConversation(input: {
  email?: null | string;
  payload: FamilyConversationGenerationPayload;
  userId: string;
}) {
  const profile = await getActiveFamilyProfileForUser({
    userId: input.userId,
  });

  if (!profile) {
    throw new NotFoundError(
      "Create or reactivate your Family Profile before generating a conversation.",
    );
  }

  const scenario = await getFamilyScenarioByIdForUser({
    email: input.email,
    scenarioId: input.payload.scenarioId,
    userId: input.userId,
    requireActive: true,
  });

  const { answer, conversationId } = await callAiTutor({
    query: buildFamilyConversationPrompt({
      familySummary: buildCompactFamilyProfileSummary(profile.profileMarkdown),
      childFocus: input.payload.childFocus,
      conversationLength: input.payload.conversationLength as FamilyConversationLength,
      scenarioTitle: scenario.title,
      scenarioCategory: scenario.category,
      scenarioDescription: scenario.description,
      difficulty: scenario.difficulty,
      targetLevel: input.payload.targetLevel as FamilyTargetLevel,
      vietnameseSupport: input.payload.vietnameseSupport,
    }),
  });

  const savedConversation = await prisma.familyConversation.create({
    data: {
      userId: input.userId,
      scenarioId: scenario.id,
      childFocus: input.payload.childFocus,
      title: buildConversationTitle({
        scenario,
        childFocus: input.payload.childFocus,
      }),
      conversationMarkdown: ensureConversationMarkdown(answer),
      aiConversationId: conversationId,
    },
    include: {
      scenario: {
        select: {
          id: true,
          title: true,
          category: true,
        },
      },
    },
  });

  return mapFamilyConversation(savedConversation);
}

export function buildFamilyConversationSuccessSummary(input: {
  childFocus: "BOTH" | "KIWI" | "VIVI";
  createdAt: string;
  scenarioTitle: string;
}) {
  return `${input.scenarioTitle} for ${input.childFocus.toLowerCase()} generated at ${formatDateTime(
    input.createdAt,
  )}.`;
}

export function logFamilyConversationFailure(input: {
  error: unknown;
  scenarioId?: string;
  userId?: string;
}) {
  logger.error(
    {
      error: input.error,
      userId: input.userId,
      scenarioId: input.scenarioId,
    },
    "Family conversation generation failed",
  );
}
