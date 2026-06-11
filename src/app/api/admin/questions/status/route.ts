import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ieltsQuestionStatusUpdateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { setIeltsQuestionStatus } from "@/server/questions/question-generator-service";

export async function POST(request: Request) {
  let actorId: string | undefined;
  let questionId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;

    const payload = ieltsQuestionStatusUpdateSchema.parse(await request.json());
    questionId = payload.questionId;

    const question = await setIeltsQuestionStatus({
      actorId,
      questionId,
      status: payload.status,
    });

    logger.info(
      { actorId, questionId, status: payload.status },
      "IELTS question status updated",
    );

    return NextResponse.json({ question });
  } catch (error) {
    logger.error(
      { error, actorId, questionId },
      "IELTS question status update failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
