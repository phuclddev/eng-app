import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ideaQuestionMappingSuggestSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { suggestIdeaQuestionMappings } from "@/server/speaking-ideas/question-map-service";

export async function POST(request: Request) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;
    const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = ideaQuestionMappingSuggestSchema.parse(rawBody);

    logger.info(
      {
        actorId,
        mode: payload.mode,
        questionId: payload.questionId ?? null,
        ideaId: payload.ideaId ?? null,
        limit: payload.limit,
      },
      "Speaking idea question mapping suggestion started",
    );

    const suggestions = await suggestIdeaQuestionMappings({
      actorId,
      payload,
    });

    logger.info(
      {
        actorId,
        mode: payload.mode,
        suggestionCount: suggestions.length,
      },
      "Speaking idea question mapping suggestion succeeded",
    );

    return NextResponse.json({
      suggestions,
    });
  } catch (error) {
    logger.error({ error, actorId }, "Speaking idea question mapping suggestion failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
