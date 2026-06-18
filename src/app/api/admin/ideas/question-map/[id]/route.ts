import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ideaQuestionMapUpdateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import {
  deleteIdeaQuestionMap,
  updateIdeaQuestionMap,
} from "@/server/speaking-ideas/question-map-service";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;
    const { id } = await context.params;
    const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = ideaQuestionMapUpdateSchema.parse(rawBody);
    const mapping = await updateIdeaQuestionMap(id, payload);

    logger.info({ actorId, mapId: id }, "Speaking idea question mapping updated");

    return NextResponse.json({
      mapping,
      message: "Idea-question mapping updated.",
    });
  } catch (error) {
    logger.error({ error, actorId }, "Failed to update idea-question mapping");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;
    const { id } = await context.params;
    await deleteIdeaQuestionMap(id);

    logger.info({ actorId, mapId: id }, "Speaking idea question mapping deleted");

    return NextResponse.json({
      ok: true,
      message: "Idea-question mapping removed.",
    });
  } catch (error) {
    logger.error({ error, actorId }, "Failed to delete idea-question mapping");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
