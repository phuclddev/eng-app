import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyRoleplayMessageSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { sendFamilyRoleplayMessage } from "@/server/family/family-roleplay-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyRoleplayMessageSchema.parse(await request.json());
    sessionId = payload.sessionId;

    const record = await sendFamilyRoleplayMessage({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        sessionId,
        turn: record.turnsTaken,
      },
      "Family roleplay message exchanged",
    );

    return NextResponse.json({ session: record });
  } catch (error) {
    logger.error(
      { error, userId, sessionId },
      "Family roleplay message failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
