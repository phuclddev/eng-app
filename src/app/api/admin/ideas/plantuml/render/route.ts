import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { plantumlRenderSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { getPlantumlRenderUrl } from "@/server/plantuml";

export async function POST(request: Request) {
  let actorId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    actorId = session.user.id;

    const rawBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const payload = plantumlRenderSchema.parse(rawBody);

    logger.info(
      {
        actorId,
        sourceLength: payload.sourceText.length,
      },
      "PlantUML render started",
    );

    const renderUrl = getPlantumlRenderUrl(payload.sourceText, "svg");
    const response = await fetch(renderUrl, {
      method: "GET",
      headers: {
        Accept: "image/svg+xml,text/plain;q=0.9,*/*;q=0.1",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`PlantUML server responded with ${response.status}.`);
    }

    const svg = await response.text();

    logger.info(
      {
        actorId,
        sourceLength: payload.sourceText.length,
      },
      "PlantUML render succeeded",
    );

    return NextResponse.json({ svg });
  } catch (error) {
    logger.error({ error, actorId }, "PlantUML render failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
