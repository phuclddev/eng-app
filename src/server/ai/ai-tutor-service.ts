import {
  parseStructuredSpeakingFeedback,
} from "@/lib/ai-tutor";
import type {
  AiTutorPurpose,
  AiTutorSpeakingAnswerContext,
} from "@/lib/types";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/server/prisma";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildAiTutorQuery } from "@/server/ai/ai-tutor-prompt-builder";

function truncateTitle(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 96) || "AI Tutor conversation";
}

async function getOwnedConversation({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const conversation = await prisma.aiConversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  });

  if (!conversation) {
    throw new ForbiddenError("This AI conversation does not belong to you.");
  }

  return conversation;
}

export async function chatWithAiTutor({
  userId,
  message,
  purpose = "GENERAL_CHAT",
  conversationId,
  context,
}: {
  userId: string;
  message: string;
  purpose?: AiTutorPurpose;
  conversationId?: string;
  context?: AiTutorSpeakingAnswerContext;
}) {
  const existingConversation = conversationId
    ? await getOwnedConversation({
        conversationId,
        userId,
      })
    : null;
  const effectivePurpose =
    context?.kind === "SPEAKING_ANSWER_REVIEW"
      ? "SPEAKING_COACH"
      : existingConversation?.purpose ?? purpose;

  const upstreamResponse = await callAiTutor({
    query: buildAiTutorQuery({
      message,
      purpose: effectivePurpose,
      context,
    }),
    conversationId: existingConversation?.externalConversationId,
  });

  const structuredFeedback =
    context?.kind === "SPEAKING_ANSWER_REVIEW"
      ? parseStructuredSpeakingFeedback(upstreamResponse.answer)
      : null;

  if (!existingConversation) {
    const createdConversation = await prisma.aiConversation.create({
      data: {
        userId,
        externalConversationId: upstreamResponse.conversationId,
        purpose: effectivePurpose,
        title: truncateTitle(message),
      },
    });

    return {
      answer: upstreamResponse.answer,
      conversationId: createdConversation.id,
      structuredFeedback: structuredFeedback ?? undefined,
    };
  }

  await prisma.aiConversation.update({
    where: {
      id: existingConversation.id,
    },
    data: {
      externalConversationId: upstreamResponse.conversationId,
      title: existingConversation.title || truncateTitle(message),
    },
  });

  return {
    answer: upstreamResponse.answer,
    conversationId: existingConversation.id,
    structuredFeedback: structuredFeedback ?? undefined,
  };
}
