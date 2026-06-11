import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyPracticeStartSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { buildFamilyPracticeDeckForUser } from "@/server/family/family-practice-service";

export async function POST(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const rawBody = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const payload = familyPracticeStartSchema.parse(rawBody);

    const deck = await buildFamilyPracticeDeckForUser({
      userId,
      mode: payload.mode,
      maxItems: payload.maxItems,
    });

    logger.info(
      {
        userId,
        mode: payload.mode,
        totalDue: deck.totalDue,
        totalApprovedChunks: deck.totalApprovedChunks,
        exerciseCount: deck.exercises.length,
      },
      "Family practice deck generated",
    );

    return NextResponse.json({ deck });
  } catch (error) {
    logger.error({ error, userId }, "Family practice deck generation failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
