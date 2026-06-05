import { getEnv, isAiTutorConfigured } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const AI_TUTOR_TIMEOUT_MS = 15_000;

type ChatflowResponse = {
  data?: {
    outputs?: {
      answer?: unknown;
      conversation_id?: unknown;
    };
  };
};

export async function callAiTutor({
  query,
  conversationId,
}: {
  query: string;
  conversationId?: string;
}) {
  if (!isAiTutorConfigured()) {
    throw new AppError(
      "AI Tutor is not configured on this environment.",
      503,
      "AI_TUTOR_NOT_CONFIGURED",
    );
  }

  const env = getEnv();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TUTOR_TIMEOUT_MS);

  try {
    const response = await fetch(env.AI_CHATFLOW_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_CHATFLOW_TOKEN}`,
      },
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn(
        {
          statusCode: response.status,
          hasConversationId: Boolean(conversationId),
          queryLength: query.length,
        },
        "AI Tutor upstream returned a non-success response",
      );
      throw new AppError(
        "AI Tutor is temporarily unavailable.",
        502,
        "AI_TUTOR_UPSTREAM_ERROR",
      );
    }

    const payload = (await response.json()) as ChatflowResponse;
    const answer = payload.data?.outputs?.answer;
    const returnedConversationId = payload.data?.outputs?.conversation_id;
    const safeConversationId =
      typeof returnedConversationId === "string" && returnedConversationId.trim().length > 0
        ? returnedConversationId.trim()
        : conversationId;

    if (typeof answer !== "string" || answer.trim().length === 0 || !safeConversationId) {
      logger.warn(
        {
          hasAnswer: typeof answer === "string" && answer.trim().length > 0,
          hasConversationId: Boolean(safeConversationId),
          queryLength: query.length,
        },
        "AI Tutor upstream response was missing required outputs",
      );
      throw new AppError(
        "AI Tutor returned an incomplete response.",
        502,
        "AI_TUTOR_INVALID_RESPONSE",
      );
    }

    return {
      answer: answer.trim(),
      conversationId: safeConversationId,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"))
    ) {
      logger.warn(
        {
          hasConversationId: Boolean(conversationId),
          queryLength: query.length,
        },
        "AI Tutor request timed out",
      );
      throw new AppError(
        "AI Tutor took too long to respond.",
        504,
        "AI_TUTOR_TIMEOUT",
      );
    }

    logger.error(
      {
        error,
        hasConversationId: Boolean(conversationId),
        queryLength: query.length,
      },
      "Failed to call AI Tutor upstream",
    );
    throw new AppError(
      "AI Tutor is temporarily unavailable.",
      502,
      "AI_TUTOR_UPSTREAM_ERROR",
    );
  } finally {
    clearTimeout(timeout);
  }
}
