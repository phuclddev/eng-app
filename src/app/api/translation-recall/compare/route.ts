import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { translationCompareSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { compareTranslationRecallAttempt } from "@/server/translation/translation-compare-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let scriptId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = translationCompareSchema.parse(await request.json());
    scriptId = payload.scriptId;

    const result = await compareTranslationRecallAttempt({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        scriptId,
        sentenceId: payload.sentenceId ?? null,
        mode: payload.mode,
        score: result.attempt.score,
        missingChunkCount: result.missingChunks.length,
      },
      "Translation Recall comparison succeeded",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error, userId, scriptId },
      "Translation Recall comparison failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
