import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { aiTutorChatSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { chatWithAiTutor } from "@/server/ai/ai-tutor-service";

export async function POST(request: Request) {
  try {
    const session = await requireApprovedApiSession();
    const payload = aiTutorChatSchema.parse(await request.json());
    const response = await chatWithAiTutor({
      userId: session.user.id,
      message: payload.message,
      conversationId: payload.conversationId,
      purpose: payload.purpose,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "AI Tutor chat request failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
