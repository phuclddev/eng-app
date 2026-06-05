import type { Prisma } from "@prisma/client";

import { parseStructuredSimulatorFeedback } from "@/lib/ai-tutor";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type {
  AiSimulatorSessionRecord,
  AiTutorStructuredFeedbackSection,
  IeltsQuestionPromptOption,
} from "@/lib/types";
import type {
  AiSpeakingSimulatorMessagePayload,
  AiSpeakingSimulatorStartPayload,
} from "@/lib/validation";
import { getQuestionPromptOptions } from "@/server/data/questions";
import { prisma } from "@/server/prisma";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import {
  buildSpeakingSimulatorStartPrompt,
  buildSpeakingSimulatorTurnPrompt,
} from "@/server/ai/prompts/speaking-simulator";

type SimulatorSessionEntity = Awaited<ReturnType<typeof getSimulatorSessionEntity>>;

function mapSimulatorSession(
  session: NonNullable<SimulatorSessionEntity>,
): AiSimulatorSessionRecord {
  return {
    id: session.id,
    part: session.part,
    topic: session.topic,
    prompt: session.prompt,
    targetBand: session.targetBand,
    numberOfTurns: session.numberOfTurns,
    currentTurn: session.currentTurn,
    status: session.status,
    finalFeedback: session.finalFeedback,
    finalFeedbackSections:
      (session.finalFeedbackSections as AiTutorStructuredFeedbackSection[] | null) ?? null,
    messages: session.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      turnNumber: message.turnNumber,
      createdAt: message.createdAt.toISOString(),
    })),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

async function getSimulatorSessionEntity(id: string) {
  return prisma.aiSimulatorSession.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

async function getOwnedSimulatorSession(id: string, userId: string) {
  const session = await getSimulatorSessionEntity(id);

  if (!session) {
    throw new NotFoundError("Simulator session not found.");
  }

  if (session.userId !== userId) {
    throw new ForbiddenError("This simulator session does not belong to you.");
  }

  return session;
}

async function resolvePromptContext(
  payload: AiSpeakingSimulatorStartPayload,
): Promise<{
  part: AiSpeakingSimulatorStartPayload["part"];
  topic: string | null;
  prompt: string | null;
}> {
  if (!payload.questionId) {
    return {
      part: payload.part,
      topic: payload.topic?.trim() || null,
      prompt: payload.prompt?.trim() || null,
    };
  }

  const question = await prisma.ieltsQuestion.findUnique({
    where: {
      id: payload.questionId,
    },
    select: {
      taskType: true,
      topic: true,
      prompt: true,
    },
  });

  if (!question) {
    throw new NotFoundError("Selected speaking prompt was not found.");
  }

  return {
    part: question.taskType,
    topic: question.topic,
    prompt: question.prompt,
  };
}

export async function getSpeakingSimulatorBootstrap(userId: string): Promise<{
  sessions: AiSimulatorSessionRecord[];
  promptOptions: IeltsQuestionPromptOption[];
}> {
  const [sessions, promptOptions] = await Promise.all([
    prisma.aiSimulatorSession.findMany({
      where: { userId },
      orderBy: {
        updatedAt: "desc",
      },
      take: 8,
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    }),
    getQuestionPromptOptions(),
  ]);

  return {
    sessions: sessions.map(mapSimulatorSession),
    promptOptions,
  };
}

export async function startSpeakingSimulator(
  userId: string,
  payload: AiSpeakingSimulatorStartPayload,
) {
  const context = await resolvePromptContext(payload);
  const response = await callAiTutor({
    query: buildSpeakingSimulatorStartPrompt({
      part: context.part,
      topic: context.topic,
      prompt: context.prompt,
      targetBand: payload.targetBand ?? null,
      numberOfTurns: payload.numberOfTurns,
    }),
  });

  const session = await prisma.aiSimulatorSession.create({
    data: {
      userId,
      part: context.part,
      topic: context.topic,
      prompt: context.prompt,
      targetBand: payload.targetBand ?? null,
      numberOfTurns: payload.numberOfTurns,
      currentTurn: 0,
      externalConversationId: response.conversationId,
      messages: {
        create: {
          role: "EXAMINER",
          content: response.answer,
          turnNumber: 0,
        },
      },
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return mapSimulatorSession(session);
}

export async function sendSpeakingSimulatorMessage(
  userId: string,
  payload: AiSpeakingSimulatorMessagePayload,
) {
  const session = await getOwnedSimulatorSession(payload.sessionId, userId);

  if (session.status !== "ACTIVE") {
    throw new ValidationError("This simulator session is already complete.");
  }

  const nextTurn = session.currentTurn + 1;
  const isFinalTurn = nextTurn >= session.numberOfTurns;
  const response = await callAiTutor({
    query: buildSpeakingSimulatorTurnPrompt({
      part: session.part,
      topic: session.topic,
      prompt: session.prompt,
      learnerAnswer: payload.message,
      currentTurn: nextTurn,
      numberOfTurns: session.numberOfTurns,
      isFinalTurn,
    }),
    conversationId: session.externalConversationId,
  });
  const structuredFeedback = isFinalTurn
    ? parseStructuredSimulatorFeedback(response.answer)
    : null;

  const updatedSession = await prisma.$transaction(async (tx) => {
    await tx.aiSimulatorMessage.create({
      data: {
        sessionId: session.id,
        role: "LEARNER",
        content: payload.message,
        turnNumber: nextTurn,
      },
    });

    await tx.aiSimulatorMessage.create({
      data: {
        sessionId: session.id,
        role: isFinalTurn ? "FEEDBACK" : "EXAMINER",
        content: response.answer,
        turnNumber: nextTurn,
      },
    });

    const updateData: Prisma.AiSimulatorSessionUpdateInput = {
      currentTurn: nextTurn,
      externalConversationId: response.conversationId,
      status: isFinalTurn ? "COMPLETED" : session.status,
      finalFeedback: isFinalTurn ? response.answer : session.finalFeedback,
    };

    if (isFinalTurn) {
      updateData.finalFeedbackSections = (structuredFeedback ??
        null) as Prisma.InputJsonValue;
    }

    await tx.aiSimulatorSession.update({
      where: {
        id: session.id,
      },
      data: updateData,
    });

    return tx.aiSimulatorSession.findUnique({
      where: { id: session.id },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  });

  if (!updatedSession) {
    throw new NotFoundError("Simulator session not found after update.");
  }

  return mapSimulatorSession(updatedSession);
}
