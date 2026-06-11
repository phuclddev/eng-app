import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyConversationRecallCompareSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { compareFamilyRecallAttempt } from "@/server/family/family-conversation-recall-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string | undefined;
  let conversationId: string | undefined;
  let lineId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;
    const resolved = await params;
    conversationId = resolved.id;

    const payload = familyConversationRecallCompareSchema.parse(
      await request.json(),
    );
    lineId = payload.lineId;

    const result = await compareFamilyRecallAttempt({
      userId,
      conversationId,
      payload,
    });

    logger.info(
      {
        userId,
        conversationId,
        lineId,
        score: result.attempt.score,
        missingChunkCount: result.missingChunks.length,
      },
      "Family conversation recall comparison succeeded",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error, userId, conversationId, lineId },
      "Family conversation recall comparison failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
