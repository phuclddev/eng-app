import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { speakingIdeaGenerateAnswerSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { generateSpeakingIdeaAnswer } from "@/server/speaking-ideas/idea-answer-service";

export async function POST(request: Request) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;

    const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = speakingIdeaGenerateAnswerSchema.parse(rawBody);

    logger.info(
      {
        actorId,
        questionId: payload.questionId,
        ideaId: payload.ideaId,
        targetBand: payload.targetBand ?? null,
        length: payload.length,
      },
      "Speaking idea answer generation started",
    );

    const result = await generateSpeakingIdeaAnswer({ payload });

    logger.info(
      {
        actorId,
        questionId: payload.questionId,
        ideaId: payload.ideaId,
        selectedChunkCount: result.selectedChunkCount,
        usedChunkCount: result.usedChunks.length,
      },
      "Speaking idea answer generation succeeded",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, actorId }, "Speaking idea answer generation failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
