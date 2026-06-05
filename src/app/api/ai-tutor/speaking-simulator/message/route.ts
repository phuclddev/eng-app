import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { aiSpeakingSimulatorMessageSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { sendSpeakingSimulatorMessage } from "@/server/ai/speaking-simulator-service";

export async function POST(request: Request) {
  try {
    const session = await requireApprovedApiSession();
    const payload = aiSpeakingSimulatorMessageSchema.parse(await request.json());
    const response = await sendSpeakingSimulatorMessage(session.user.id, payload);

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "AI speaking simulator message failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
