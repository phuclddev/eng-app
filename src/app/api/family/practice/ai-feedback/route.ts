import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyPracticeAiFeedbackSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { generateFamilyPracticeFeedback } from "@/server/family/family-practice-ai-feedback-service";

export async function POST(request: Request) {
  let userId: string | undefined;
  let familyChunkId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyPracticeAiFeedbackSchema.parse(await request.json());
    familyChunkId = payload.familyChunkId;

    const result = await generateFamilyPracticeFeedback({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        familyChunkId,
        answerLength: result.answer.length,
      },
      "Family practice AI feedback generated",
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error, userId, familyChunkId },
      "Family practice AI feedback failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
