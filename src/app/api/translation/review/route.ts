import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { translationReviewSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { recordTranslationReview } from "@/server/translation/translation-review-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let sentenceId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = translationReviewSchema.parse(await request.json());
    sentenceId = payload.sentenceId;

    const sentence = await recordTranslationReview({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        sentenceId,
        confidence: payload.confidence,
      },
      "Translation review recorded",
    );

    return NextResponse.json({ sentence });
  } catch (error) {
    logger.error(
      { error, userId, sentenceId },
      "Translation review recording failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
