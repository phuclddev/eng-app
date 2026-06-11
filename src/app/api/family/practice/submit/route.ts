import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { familyPracticeSubmissionSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { submitFamilyPracticeSession } from "@/server/family/family-practice-service";

export async function POST(request: Request) {
  let userId: string | undefined;

  try {
    const session = await requireApprovedApiSession();
    userId = session.user.id;

    const payload = familyPracticeSubmissionSchema.parse(await request.json());

    const result = await submitFamilyPracticeSession({
      userId,
      payload,
    });

    logger.info(
      {
        userId,
        sessionId: result.sessionId,
        mode: payload.mode,
        totalQuestions: result.summary.totalQuestions,
        correctAnswers: result.summary.correctAnswers,
      },
      "Family practice session submitted",
    );

    return NextResponse.json({
      ok: true,
      sessionId: result.sessionId,
      summary: result.summary,
    });
  } catch (error) {
    logger.error({ error, userId }, "Family practice session submit failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
