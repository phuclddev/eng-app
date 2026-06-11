import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { translationScriptUpdateSchema } from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import {
  deleteTranslationScript,
  updateTranslationScript,
} from "@/server/translation/translation-script-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let adminId: string | undefined;
  let scriptId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    adminId = session.user.id;
    const resolved = await params;
    scriptId = resolved.id;

    const payload = translationScriptUpdateSchema.parse(await request.json());

    const script = await updateTranslationScript({
      adminId,
      scriptId,
      payload,
    });

    logger.info(
      {
        adminId,
        scriptId,
        sentenceCount: script.sentences.length,
      },
      "Translation script edited manually",
    );

    return NextResponse.json({ script });
  } catch (error) {
    logger.error(
      { error, adminId, scriptId },
      "Translation script manual edit failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let adminId: string | undefined;
  let scriptId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    adminId = session.user.id;
    const resolved = await params;
    scriptId = resolved.id;

    const result = await deleteTranslationScript({
      adminId,
      scriptId,
    });

    logger.info({ adminId, scriptId }, "Translation script deleted");

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error, adminId, scriptId },
      "Translation script delete failed",
    );
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
