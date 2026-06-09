import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyConversationGenerationSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { generateFamilyConversation } from "@/server/family/family-conversation-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let scenarioId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;
    const payload = familyConversationGenerationSchema.parse(await request.json());
    scenarioId = payload.scenarioId;

    logger.info(
      {
        userId,
        scenarioId,
        childFocus: payload.childFocus,
        conversationLength: payload.conversationLength,
        targetLevel: payload.targetLevel,
        vietnameseSupport: payload.vietnameseSupport,
      },
      "Family conversation generation started",
    );

    const conversation = await generateFamilyConversation({
      userId,
      email: session.user.email,
      payload,
    });

    logger.info(
      {
        userId,
        scenarioId,
        conversationId: conversation.id,
      },
      "Family conversation generation succeeded",
    );

    return NextResponse.json({
      conversation,
    });
  } catch (error) {
    logger.error(
      {
        error,
        userId,
        scenarioId,
      },
      "Family conversation generation failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
