import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { aiSpeakingSimulatorStartSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { startSpeakingSimulator } from "@/server/ai/speaking-simulator-service";

export async function POST(request: Request) {
  try {
    const session = await requireApprovedApiSession();
    const payload = aiSpeakingSimulatorStartSchema.parse(await request.json());
    const response = await startSpeakingSimulator(session.user.id, payload);

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "AI speaking simulator start failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
