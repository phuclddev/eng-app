import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireApprovedApiSession } from "@/server/auth";
import { listFamilyRoleplaySessions } from "@/server/family/family-roleplay-service";

export async function GET() {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const sessions = await listFamilyRoleplaySessions({ userId });

    return NextResponse.json({ sessions });
  } catch (error) {
    logger.error({ error, userId }, "Family roleplay listing failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
