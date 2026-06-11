import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyRoleplayArchiveSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { archiveFamilyRoleplaySession } from "@/server/family/family-roleplay-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyRoleplayArchiveSchema.parse(await request.json());
    sessionId = payload.sessionId;

    const record = await archiveFamilyRoleplaySession({
      userId,
      sessionId,
    });

    logger.info(
      { userId, sessionId, status: record.status },
      "Family roleplay session archived",
    );

    return NextResponse.json({ session: record });
  } catch (error) {
    logger.error(
      { error, userId, sessionId },
      "Family roleplay archive failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
