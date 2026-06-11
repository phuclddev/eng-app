import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { translationExtractChunkSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { extractTranslationChunk } from "@/server/translation/translation-chunk-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let sentenceId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = translationExtractChunkSchema.parse(await request.json());
    sentenceId = payload.sentenceId;

    const extracted = await extractTranslationChunk({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        sentenceId,
        chunkLength: extracted.chunk.length,
      },
      "Translation chunk extracted",
    );

    return NextResponse.json({ extracted });
  } catch (error) {
    logger.error(
      { error, userId, sentenceId },
      "Translation chunk extraction failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
