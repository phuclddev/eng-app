import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { translationSaveChunkSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { saveTranslationChunk } from "@/server/translation/translation-chunk-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let sentenceId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = translationSaveChunkSchema.parse(await request.json());
    sentenceId = payload.sentenceId;

    const mapping = await saveTranslationChunk({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        sentenceId,
        chunkId: mapping.chunkId,
      },
      "Translation chunk saved to library",
    );

    return NextResponse.json({ mapping });
  } catch (error) {
    logger.error(
      { error, userId, sentenceId },
      "Translation save-to-library failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
