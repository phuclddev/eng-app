import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyTodayPlanSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { generateFamilyDailyPlan } from "@/server/family/family-daily-plan-service";

export async function POST(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const rawBody = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const payload = familyTodayPlanSchema.parse(rawBody);

    const result = await generateFamilyDailyPlan({
      userId,
      childFocus: payload.childFocus,
      forceRefresh: payload.forceRefresh,
    });

    logger.info(
      {
        userId,
        childFocus: payload.childFocus,
        cached: result.plan.cached,
        dueReviews: result.recommendations.dueReviewCount,
        weakChunks: result.recommendations.weakChunkCount,
      },
      "Family daily plan generated",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, userId }, "Family daily plan generation failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
