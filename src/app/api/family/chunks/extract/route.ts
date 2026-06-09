import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyChunkExtractionSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { extractFamilyChunksFromConversation } from "@/server/family/family-chunk-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let conversationId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;
    const payload = familyChunkExtractionSchema.parse(await request.json());
    conversationId = payload.conversationId;

    logger.info(
      {
        userId,
        conversationId,
      },
      "Family chunk extraction started",
    );

    const response = await extractFamilyChunksFromConversation({
      userId,
      conversationId,
    });

    logger.info(
      {
        userId,
        conversationId,
        created: response.summary.created,
        skippedDuplicates: response.summary.skippedDuplicates,
      },
      "Family chunk extraction succeeded",
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      {
        error,
        userId,
        conversationId,
      },
      "Family chunk extraction failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
