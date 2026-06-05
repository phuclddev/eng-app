import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { aiChunkCoachSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { getAiChunkCoach } from "@/server/ai/chunk-coach-service";

export async function POST(request: Request) {
  try {
    await requireApprovedApiSession();
    const payload = aiChunkCoachSchema.parse(await request.json());
    const response = await getAiChunkCoach(payload.chunkId);

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "AI chunk coach request failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
