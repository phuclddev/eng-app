import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { translationFromQuestionSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { generateTranslationRecallFromQuestion } from "@/server/translation/translation-recall-from-question-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let speakingQuestionId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = translationFromQuestionSchema.parse(await request.json());
    speakingQuestionId = payload.speakingQuestionId;

    logger.info(
      {
        userId,
        speakingQuestionId,
        length: payload.length,
        targetBand: payload.targetBand ?? null,
        includeChunkLibrary: payload.includeChunkLibrary,
        regenerate: payload.regenerate,
      },
      "Translation Recall from-question generation started",
    );

    const result = await generateTranslationRecallFromQuestion({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        speakingQuestionId,
        scriptId: result.script.id,
        version: result.script.version,
        duplicate: result.duplicate,
        fallbackUsed: result.fallbackUsed,
        usedChunkCount: result.usedChunks.length,
      },
      "Translation Recall from-question generation succeeded",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error, userId, speakingQuestionId },
      "Translation Recall from-question generation failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
