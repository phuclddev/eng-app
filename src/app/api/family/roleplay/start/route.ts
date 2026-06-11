import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyRoleplayStartSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { startFamilyRoleplaySession } from "@/server/family/family-roleplay-service";

export async function POST(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyRoleplayStartSchema.parse(await request.json());
    const record = await startFamilyRoleplaySession({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        sessionId: record.id,
        scenarioId: payload.scenarioId ?? null,
        userRole: payload.userRole,
        aiRole: payload.aiRole,
        childFocus: payload.childFocus,
        targetLevel: payload.targetLevel,
        turnsLimit: payload.turnsLimit,
      },
      "Family roleplay session started",
    );

    return NextResponse.json({ session: record });
  } catch (error) {
    logger.error({ error, userId }, "Family roleplay start failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
