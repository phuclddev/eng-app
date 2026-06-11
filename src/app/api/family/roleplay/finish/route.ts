import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyRoleplayFinishSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { finishFamilyRoleplaySession } from "@/server/family/family-roleplay-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyRoleplayFinishSchema.parse(await request.json());
    sessionId = payload.sessionId;

    const record = await finishFamilyRoleplaySession({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        sessionId,
        hasFinalFeedback: Boolean(record.finalFeedbackMarkdown),
      },
      "Family roleplay session finished",
    );

    return NextResponse.json({ session: record });
  } catch (error) {
    logger.error(
      { error, userId, sessionId },
      "Family roleplay finish failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
