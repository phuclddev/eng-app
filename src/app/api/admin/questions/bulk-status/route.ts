import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ieltsQuestionBulkStatusUpdateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { bulkSetIeltsQuestionStatus } from "@/server/questions/question-generator-service";

export async function POST(request: Request) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;

    const payload = ieltsQuestionBulkStatusUpdateSchema.parse(
      await request.json(),
    );

    const questions = await bulkSetIeltsQuestionStatus({
      actorId,
      questionIds: payload.questionIds,
      status: payload.status,
    });

    logger.info(
      {
        actorId,
        count: questions.length,
        status: payload.status,
      },
      "IELTS question bulk status updated",
    );

    return NextResponse.json({ questions });
  } catch (error) {
    logger.error(
      { error, actorId },
      "IELTS question bulk status update failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
