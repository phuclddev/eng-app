import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { speakingIdeaGenerateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { generateSpeakingIdeas } from "@/server/speaking-ideas/idea-generator-service";

export async function POST(request: Request) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;

    const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = speakingIdeaGenerateSchema.parse(rawBody);

    logger.info(
      {
        actorId,
        topic: payload.topic ?? null,
        count: payload.count,
        targetBand: payload.targetBand,
        includeExistingContext: payload.includeExistingContext,
      },
      "Speaking idea generation started",
    );

    const summary = await generateSpeakingIdeas({
      actorId,
      payload,
    });

    logger.info(
      {
        actorId,
        batchId: summary.batchId,
        created: summary.created,
        skippedDuplicates: summary.skippedDuplicates,
        warnings: summary.warnings.length,
        parseErrors: summary.parseErrors.length,
      },
      "Speaking idea generation succeeded",
    );

    return NextResponse.json({ summary });
  } catch (error) {
    logger.error({ error, actorId }, "Speaking idea generation failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
