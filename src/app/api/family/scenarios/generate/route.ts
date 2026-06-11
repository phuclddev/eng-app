import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyScenarioGenerateSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { generateFamilyScenarios } from "@/server/family/family-scenario-generator-service";

export async function POST(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const rawBody = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const payload = familyScenarioGenerateSchema.parse(rawBody);

    logger.info(
      {
        userId,
        count: payload.count,
        childFocus: payload.childFocus ?? null,
        category: payload.category ?? null,
        includeExistingContext: payload.includeExistingContext,
      },
      "Family scenario generation started",
    );

    const summary = await generateFamilyScenarios({
      userId,
      email: session.user.email,
      payload,
    });

    logger.info(
      {
        userId,
        created: summary.created,
        skippedDuplicates: summary.skippedDuplicates,
      },
      "Family scenario generation succeeded",
    );

    return NextResponse.json({ summary });
  } catch (error) {
    logger.error({ error, userId }, "Family scenario generation failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
