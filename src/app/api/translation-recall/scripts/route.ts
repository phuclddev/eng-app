import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { translationScriptCreateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { createTranslationScript } from "@/server/translation/translation-script-service";

export async function POST(request: Request) {
  let adminId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    adminId = session.user.id;

    const payload = translationScriptCreateSchema.parse(await request.json());

    const script = await createTranslationScript({
      adminId,
      payload,
    });

    logger.info(
      {
        adminId,
        scriptId: script.id,
        sentenceCount: script.sentences.length,
        topic: script.topic,
      },
      "Translation script created manually",
    );

    return NextResponse.json({ script });
  } catch (error) {
    logger.error({ error, adminId }, "Translation script manual create failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
