import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { aiMissingChunksSchema } from "@/lib/validation";
import { requireApprovedApiSession } from "@/server/auth";
import { getAiMissingChunksRecommendation } from "@/server/ai/missing-chunks-service";

export async function POST(request: Request) {
  try {
    await requireApprovedApiSession();
    const payload = aiMissingChunksSchema.parse(await request.json());
    const response = await getAiMissingChunksRecommendation(payload);

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, "AI missing chunks request failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
