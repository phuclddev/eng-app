import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { FamilyPracticeAiFeedbackResponse } from "@/lib/types";
import type { FamilyPracticeAiFeedbackPayload } from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildFamilyPracticeFeedbackPrompt } from "@/server/ai/prompts/family-practice-feedback";
import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";
import { prisma } from "@/server/prisma";

const SPEAKER_LABELS: Record<string, string> = {
  FATHER: "Dad",
  MOTHER: "Mom",
  CHILD: "Child (Kiwi or Vivi)",
  GRANDPARENT: "Grandparent",
  GENERAL: "Family speaker",
};

export async function generateFamilyPracticeFeedback(input: {
  userId: string;
  payload: FamilyPracticeAiFeedbackPayload;
}): Promise<FamilyPracticeAiFeedbackResponse> {
  const chunk = await prisma.familyChunk.findFirst({
    where: {
      id: input.payload.familyChunkId,
      userId: input.userId,
    },
  });

  if (!chunk) {
    throw new NotFoundError("Family chunk was not found.");
  }

  if (chunk.status !== "APPROVED") {
    throw new AppError(
      "Family practice AI feedback only works for approved family chunks.",
      400,
      "FAMILY_CHUNK_NOT_APPROVED",
    );
  }

  const profile = await getActiveFamilyProfileForUser({
    userId: input.userId,
  });
  const speakerRoleLabel = SPEAKER_LABELS[chunk.speakerRole] ?? "Family speaker";

  try {
    const { answer } = await callAiTutor({
      query: buildFamilyPracticeFeedbackPrompt({
        familySummary: profile
          ? buildCompactFamilyProfileSummary(profile.profileMarkdown)
          : "No active family profile is available. Stay generic and warm.",
        scenarioCategory: chunk.scenarioCategory,
        speakerRole: speakerRoleLabel,
        targetChunk: chunk.text,
        meaningVi: chunk.meaningVi,
        usageContext: chunk.usageContext,
        practicePrompt: input.payload.prompt,
        userAnswer: input.payload.userAnswer,
      }),
    });

    const trimmed = answer.trim();

    if (!trimmed) {
      throw new AppError(
        "AI returned an empty family practice feedback.",
        502,
        "AI_TUTOR_INVALID_RESPONSE",
      );
    }

    return {
      answer: trimmed,
      available: true,
    };
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        familyChunkId: chunk.id,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family practice AI feedback failed",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Family practice feedback is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }
}
