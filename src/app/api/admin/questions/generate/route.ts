import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ieltsQuestionGenerateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { generateIeltsSpeakingQuestions } from "@/server/questions/question-generator-service";

export async function POST(request: Request) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;

    const rawBody = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const payload = ieltsQuestionGenerateSchema.parse(rawBody);

    logger.info(
      {
        actorId,
        part: payload.part,
        count: payload.count,
        topic: payload.topic ?? null,
        includeRecommendedChunks: payload.includeRecommendedChunks,
      },
      "IELTS question generation started",
    );

    const summary = await generateIeltsSpeakingQuestions({
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
      "IELTS question generation succeeded",
    );

    return NextResponse.json({ summary });
  } catch (error) {
    logger.error({ error, actorId }, "IELTS question generation failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
