import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ideaQuestionMapCreateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { createIdeaQuestionMap } from "@/server/speaking-ideas/question-map-service";

export async function POST(request: Request) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;

    const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = ideaQuestionMapCreateSchema.parse(rawBody);

    const mapping = await createIdeaQuestionMap(payload);

    logger.info(
      {
        actorId,
        ideaId: payload.ideaId,
        questionId: payload.questionId,
        isPrimary: payload.isPrimary,
        relevanceScore: payload.relevanceScore,
      },
      "Speaking idea question mapping created",
    );

    return NextResponse.json({
      mapping,
      message: "Idea-question mapping created.",
    });
  } catch (error) {
    logger.error({ error, actorId }, "Failed to create idea-question mapping");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
