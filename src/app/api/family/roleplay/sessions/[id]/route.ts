import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireApprovedApiSession } from "@/server/auth";
import { getFamilyRoleplaySessionForUser } from "@/server/family/family-roleplay-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let userId: string | undefined;
  let sessionId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const resolved = await params;
    sessionId = resolved.id;

    const record = await getFamilyRoleplaySessionForUser({
      userId,
      sessionId,
    });

    return NextResponse.json({ session: record });
  } catch (error) {
    logger.error(
      { error, userId, sessionId },
      "Family roleplay session fetch failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
