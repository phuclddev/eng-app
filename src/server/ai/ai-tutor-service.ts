import type { AiTutorPurpose } from "@/lib/types";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/server/prisma";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";

function truncateTitle(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 96) || "AI Tutor conversation";
}

function buildPurposeGuidance(purpose: AiTutorPurpose) {
  switch (purpose) {
    case "SENTENCE_CORRECTION":
      return [
        "Purpose: sentence correction for IELTS Speaking chunk practice.",
        "Correct grammar, word choice, and chunk placement naturally.",
      ].join("\n");
    case "SPEAKING_COACH":
      return [
        "Purpose: speaking coach for IELTS Speaking prompts.",
        "Suggest a concise sample answer and practical chunk usage.",
      ].join("\n");
    case "CHUNK_EXPLANATION":
      return [
        "Purpose: explain chunk meaning and natural usage for IELTS Speaking.",
        "Contrast natural and unnatural usage briefly when helpful.",
      ].join("\n");
    case "GENERAL_CHAT":
    default:
      return "Purpose: general IELTS Speaking tutoring and chunk guidance.";
  }
}

export function buildAiTutorQuery({
  message,
  purpose,
}: {
  message: string;
  purpose: AiTutorPurpose;
}) {
  return [
    "You are AI Tutor inside an IELTS Speaking chunk training app.",
    "Focus on IELTS Speaking only.",
    "Keep answers concise and practical.",
    "Explain in Vietnamese when useful, but preserve strong English examples.",
    "Suggest chunks naturally instead of forcing them.",
    "Avoid overly long answers and avoid generic filler.",
    buildPurposeGuidance(purpose),
    "",
    "User request:",
    message.trim(),
  ].join("\n");
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
}: {
  userId: string;
  message: string;
  purpose?: AiTutorPurpose;
  conversationId?: string;
}) {
  const existingConversation = conversationId
    ? await getOwnedConversation({
        conversationId,
        userId,
      })
    : null;

  const upstreamResponse = await callAiTutor({
    query: buildAiTutorQuery({
      message,
      purpose: existingConversation?.purpose ?? purpose,
    }),
    conversationId: existingConversation?.externalConversationId,
  });

  if (!existingConversation) {
    const createdConversation = await prisma.aiConversation.create({
      data: {
        userId,
        externalConversationId: upstreamResponse.conversationId,
        purpose,
        title: truncateTitle(message),
      },
    });

    return {
      answer: upstreamResponse.answer,
      conversationId: createdConversation.id,
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
  };
}
