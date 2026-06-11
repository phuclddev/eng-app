import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyConversationRecallCreateSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { createFamilyRecallLines } from "@/server/family/family-conversation-recall-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string | undefined;
  let conversationId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;
    const resolved = await params;
    conversationId = resolved.id;

    const rawBody = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const payload = familyConversationRecallCreateSchema.parse(rawBody);

    const result = await createFamilyRecallLines({
      userId,
      email: session.user.email,
      conversationId,
      payload,
    });

    logger.info(
      {
        userId,
        conversationId,
        created: result.created,
        regenerate: payload.regenerate,
      },
      "Family conversation recall created",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error, userId, conversationId },
      "Family conversation recall create failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
