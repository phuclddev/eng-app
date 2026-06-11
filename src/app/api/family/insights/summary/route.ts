import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyInsightsSummarySchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { generateFamilyWeeklyInsightSummary } from "@/server/family/family-insights-service";

export async function POST(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const rawBody = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const payload = familyInsightsSummarySchema.parse(rawBody);

    const result = await generateFamilyWeeklyInsightSummary({
      userId,
      forceRefresh: payload.forceRefresh,
    });

    logger.info(
      { userId, length: result.answer.length },
      "Family weekly insights summary generated",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error, userId }, "Family weekly insights summary failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
