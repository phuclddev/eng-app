import { FAMILY_ROLEPLAY_ROLE_LABELS } from "@/lib/constants";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  FamilyRoleplayMessageRecord,
  FamilyRoleplayRole,
  FamilyRoleplaySessionRecord,
  FamilyRoleplaySessionSummary,
} from "@/lib/types";
import type {
  FamilyRoleplayFinishPayload,
  FamilyRoleplayMessagePayload,
  FamilyRoleplayStartPayload,
} from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import {
  buildFamilyRoleplayFinishPrompt,
  buildFamilyRoleplayStartPrompt,
  buildFamilyRoleplayTurnPrompt,
} from "@/server/ai/prompts/family-roleplay";
import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";
import { prisma } from "@/server/prisma";

type RoleplaySessionEntity = Awaited<ReturnType<typeof loadSessionEntity>>;

function loadSessionEntity(sessionId: string) {
  return prisma.familyRoleplaySession.findUnique({
    where: { id: sessionId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      scenario: {
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          childFocus: true,
        },
      },
    },
  });
}

async function loadOwnedSession(sessionId: string, userId: string) {
  const session = await loadSessionEntity(sessionId);

  if (!session) {
    throw new NotFoundError("Family roleplay session was not found.");
  }

  if (session.userId !== userId) {
    throw new ForbiddenError(
      "This family roleplay session does not belong to you.",
    );
  }

  return session;
}

function mapMessage(
  message: NonNullable<RoleplaySessionEntity>["messages"][number],
): FamilyRoleplayMessageRecord {
  return {
    id: message.id,
    sender: message.sender,
    roleLabel: message.roleLabel,
    content: message.content,
    turnNumber: message.turnNumber,
    createdAt: message.createdAt.toISOString(),
  };
}

function mapSession(
  session: NonNullable<RoleplaySessionEntity>,
): FamilyRoleplaySessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    scenarioId: session.scenarioId,
    userRole: session.userRole,
    aiRole: session.aiRole,
    childFocus: session.childFocus,
    targetLevel: session.targetLevel as FamilyRoleplaySessionRecord["targetLevel"],
    title: session.title,
    status: session.status,
    turnsLimit: session.turnsLimit,
    turnsTaken: session.turnsTaken,
    finalFeedbackMarkdown: session.finalFeedbackMarkdown,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    scenario: session.scenario
      ? {
          id: session.scenario.id,
          title: session.scenario.title,
          category: session.scenario.category,
          description: session.scenario.description,
          childFocus: session.scenario.childFocus,
        }
      : null,
    messages: session.messages.map(mapMessage),
  };
}

function mapSummary(input: {
  id: string;
  title: string;
  userRole: FamilyRoleplayRole;
  aiRole: FamilyRoleplayRole;
  childFocus: FamilyRoleplaySessionRecord["childFocus"];
  targetLevel: string;
  status: FamilyRoleplaySessionRecord["status"];
  turnsLimit: number;
  turnsTaken: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  scenario: { title: string } | null;
}): FamilyRoleplaySessionSummary {
  return {
    id: input.id,
    title: input.title,
    userRole: input.userRole,
    aiRole: input.aiRole,
    childFocus: input.childFocus,
    targetLevel:
      input.targetLevel as FamilyRoleplaySessionSummary["targetLevel"],
    status: input.status,
    turnsLimit: input.turnsLimit,
    turnsTaken: input.turnsTaken,
    scenarioTitle: input.scenario?.title ?? null,
    startedAt: input.startedAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
    completedAt: input.completedAt?.toISOString() ?? null,
  };
}

function buildSessionTitle(input: {
  aiRole: FamilyRoleplayRole;
  userRole: FamilyRoleplayRole;
  scenarioTitle: string | null;
}) {
  const ai = FAMILY_ROLEPLAY_ROLE_LABELS[input.aiRole];
  const user = FAMILY_ROLEPLAY_ROLE_LABELS[input.userRole];
  const base = `${user} ↔ ${ai}`;

  if (input.scenarioTitle) {
    return `${base} · ${input.scenarioTitle}`.slice(0, 191);
  }

  return base.slice(0, 191);
}

function buildTranscript(
  session: NonNullable<RoleplaySessionEntity>,
): string {
  return session.messages
    .map((message) => `${message.roleLabel}: ${message.content}`)
    .join("\n");
}

async function loadOwnedScenario(input: {
  userId: string;
  scenarioId: string;
}) {
  const scenario = await prisma.familyScenario.findFirst({
    where: {
      id: input.scenarioId,
      userId: input.userId,
    },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      childFocus: true,
    },
  });

  if (!scenario) {
    throw new NotFoundError("Family scenario was not found.");
  }

  return scenario;
}

export async function listFamilyRoleplaySessions(input: {
  userId: string;
}): Promise<FamilyRoleplaySessionSummary[]> {
  const sessions = await prisma.familyRoleplaySession.findMany({
    where: {
      userId: input.userId,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: {
      scenario: {
        select: {
          title: true,
        },
      },
    },
  });

  return sessions.map((session) =>
    mapSummary({
      id: session.id,
      title: session.title,
      userRole: session.userRole,
      aiRole: session.aiRole,
      childFocus: session.childFocus,
      targetLevel: session.targetLevel,
      status: session.status,
      turnsLimit: session.turnsLimit,
      turnsTaken: session.turnsTaken,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      scenario: session.scenario,
    }),
  );
}

export async function getFamilyRoleplaySessionForUser(input: {
  userId: string;
  sessionId: string;
}): Promise<FamilyRoleplaySessionRecord> {
  const session = await loadOwnedSession(input.sessionId, input.userId);
  return mapSession(session);
}

export async function startFamilyRoleplaySession(input: {
  userId: string;
  payload: FamilyRoleplayStartPayload;
}): Promise<FamilyRoleplaySessionRecord> {
  const { payload, userId } = input;

  const profile = await getActiveFamilyProfileForUser({ userId });
  const scenario = payload.scenarioId
    ? await loadOwnedScenario({ userId, scenarioId: payload.scenarioId })
    : null;

  const familySummary = profile
    ? buildCompactFamilyProfileSummary(profile.profileMarkdown)
    : "No active family profile is available. Improvise a warm Hanoi family scene.";

  const startPrompt = buildFamilyRoleplayStartPrompt({
    familySummary,
    aiRole: payload.userRole === payload.aiRole ? payload.aiRole : payload.aiRole,
    userRole: payload.userRole,
    childFocus: payload.childFocus,
    targetLevel: payload.targetLevel,
    scenarioTitle: scenario?.title ?? null,
    scenarioCategory: scenario?.category ?? null,
    scenarioDescription: scenario?.description ?? null,
    turnsLimit: payload.turnsLimit,
  });

  let aiResponse: Awaited<ReturnType<typeof callAiTutor>>;

  try {
    aiResponse = await callAiTutor({ query: startPrompt });
  } catch (error) {
    logger.warn(
      {
        userId,
        scenarioId: payload.scenarioId ?? null,
        aiRole: payload.aiRole,
        userRole: payload.userRole,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family roleplay start AI call failed",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Family roleplay is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const session = await prisma.familyRoleplaySession.create({
    data: {
      userId,
      scenarioId: payload.scenarioId ?? null,
      userRole: payload.userRole,
      aiRole: payload.aiRole,
      childFocus: payload.childFocus,
      targetLevel: payload.targetLevel,
      turnsLimit: payload.turnsLimit,
      title: buildSessionTitle({
        aiRole: payload.aiRole,
        userRole: payload.userRole,
        scenarioTitle: scenario?.title ?? null,
      }),
      externalConversationId: aiResponse.conversationId,
      messages: {
        create: {
          sender: "AI",
          roleLabel: FAMILY_ROLEPLAY_ROLE_LABELS[payload.aiRole],
          content: aiResponse.answer,
          turnNumber: 0,
        },
      },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      scenario: {
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          childFocus: true,
        },
      },
    },
  });

  return mapSession(session);
}

export async function sendFamilyRoleplayMessage(input: {
  userId: string;
  payload: FamilyRoleplayMessagePayload;
}): Promise<FamilyRoleplaySessionRecord> {
  const session = await loadOwnedSession(input.payload.sessionId, input.userId);

  if (session.status !== "ACTIVE") {
    throw new ValidationError(
      "This family roleplay session is already finished.",
    );
  }

  const nextTurn = session.turnsTaken + 1;
  const turnPrompt = buildFamilyRoleplayTurnPrompt({
    aiRole: session.aiRole,
    userRole: session.userRole,
    childFocus: session.childFocus,
    targetLevel: session.targetLevel as
      | "BASIC"
      | "NATURAL"
      | "ADVANCED",
    learnerMessage: input.payload.message,
    turnNumber: nextTurn,
    turnsLimit: session.turnsLimit,
  });

  let aiResponse: Awaited<ReturnType<typeof callAiTutor>>;

  try {
    aiResponse = await callAiTutor({
      query: turnPrompt,
      conversationId: session.externalConversationId ?? undefined,
    });
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        sessionId: session.id,
        turn: nextTurn,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family roleplay AI turn failed",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Family roleplay is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.familyRoleplayMessage.create({
      data: {
        sessionId: session.id,
        sender: "USER",
        roleLabel: FAMILY_ROLEPLAY_ROLE_LABELS[session.userRole],
        content: input.payload.message,
        turnNumber: nextTurn,
      },
    });

    await tx.familyRoleplayMessage.create({
      data: {
        sessionId: session.id,
        sender: "AI",
        roleLabel: FAMILY_ROLEPLAY_ROLE_LABELS[session.aiRole],
        content: aiResponse.answer,
        turnNumber: nextTurn,
      },
    });

    await tx.familyRoleplaySession.update({
      where: { id: session.id },
      data: {
        turnsTaken: nextTurn,
        externalConversationId: aiResponse.conversationId,
      },
    });
  });

  const refreshed = await loadOwnedSession(session.id, input.userId);
  return mapSession(refreshed);
}

export async function finishFamilyRoleplaySession(input: {
  userId: string;
  payload: FamilyRoleplayFinishPayload;
}): Promise<FamilyRoleplaySessionRecord> {
  const session = await loadOwnedSession(input.payload.sessionId, input.userId);

  if (session.status === "ARCHIVED") {
    throw new ValidationError(
      "Archived family roleplay sessions cannot be finished.",
    );
  }

  if (session.status === "COMPLETED") {
    return mapSession(session);
  }

  if (session.messages.length === 0) {
    throw new ValidationError(
      "This family roleplay session has no messages to summarize yet.",
    );
  }

  const finishPrompt = buildFamilyRoleplayFinishPrompt({
    aiRole: session.aiRole,
    userRole: session.userRole,
    targetLevel: session.targetLevel as
      | "BASIC"
      | "NATURAL"
      | "ADVANCED",
    transcript: buildTranscript(session),
  });

  let finalFeedback = "";

  try {
    const response = await callAiTutor({
      query: finishPrompt,
      conversationId: session.externalConversationId ?? undefined,
    });
    finalFeedback = response.answer.trim();
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        sessionId: session.id,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family roleplay finish AI call failed",
    );

    finalFeedback =
      "_Family roleplay coach is not available right now. Your transcript is saved._";
  }

  const completedAt = new Date();

  await prisma.familyRoleplaySession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      completedAt,
      finalFeedbackMarkdown: finalFeedback,
    },
  });

  const refreshed = await loadOwnedSession(session.id, input.userId);
  return mapSession(refreshed);
}

export async function archiveFamilyRoleplaySession(input: {
  userId: string;
  sessionId: string;
}): Promise<FamilyRoleplaySessionSummary> {
  const session = await loadOwnedSession(input.sessionId, input.userId);

  const updated = await prisma.familyRoleplaySession.update({
    where: { id: session.id },
    data: {
      status: "ARCHIVED",
    },
    include: {
      scenario: { select: { title: true } },
    },
  });

  return mapSummary({
    id: updated.id,
    title: updated.title,
    userRole: updated.userRole,
    aiRole: updated.aiRole,
    childFocus: updated.childFocus,
    targetLevel: updated.targetLevel,
    status: updated.status,
    turnsLimit: updated.turnsLimit,
    turnsTaken: updated.turnsTaken,
    startedAt: updated.startedAt,
    updatedAt: updated.updatedAt,
    completedAt: updated.completedAt,
    scenario: updated.scenario,
  });
}
