import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { aiSampleAnswerSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { generateQuestionSampleAnswer } from "@/server/ai/sample-answer-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let speakingPromptId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;
    const payload = aiSampleAnswerSchema.parse(await request.json());
    speakingPromptId = payload.speakingPromptId;

    logger.info(
      {
        userId,
        speakingPromptId,
        targetBand: payload.targetBand ?? null,
        maxChunks: payload.maxChunks,
      },
      "AI sample answer request started",
    );

    const response = await generateQuestionSampleAnswer({
      speakingPromptId: payload.speakingPromptId,
      targetBand: payload.targetBand,
      maxChunks: payload.maxChunks,
    });

    logger.info(
      {
        userId,
        speakingPromptId,
        selectedChunkCount: response.selectedChunkCount,
        usedChunkCount: response.usedChunks.length,
      },
      "AI sample answer request succeeded",
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      {
        error,
        userId,
        speakingPromptId,
      },
      "AI sample answer request failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
