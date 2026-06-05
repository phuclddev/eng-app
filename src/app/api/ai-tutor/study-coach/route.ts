import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { aiStudyCoachSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { getAiStudyCoachSnapshot } from "@/server/ai/study-coach-service";

export async function POST(request: Request) {
  try {
    const session = await requireApprovedApiSession();
    const payload = aiStudyCoachSchema.parse(await request.json());
    const response = await getAiStudyCoachSnapshot({
      userId: session.user.id,
      forceRefresh: payload.forceRefresh,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "AI study coach request failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
