import { NextResponse } from "next/server";

import { getErrorResponse, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { requireAdminApiSession } from "@/server/auth";
import { importTranslationCsv } from "@/server/translation/translation-script-service";

const ALLOWED_EXTENSIONS = [".csv", ".CSV"];

export async function POST(request: Request) {
  let adminId: string | undefined;

  try {
    const session = await requireAdminApiSession();
    adminId = session.user.id;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("A CSV file is required.");
    }

    const filename = file.name ?? "translation.csv";
    const lowered = filename.toLowerCase();

    if (lowered.endsWith(".xlsx") || lowered.endsWith(".xls")) {
      throw new ValidationError(
        "XLSX import is not supported yet — export the sheet as CSV (UTF-8) and upload again.",
      );
    }

    if (!ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext))) {
      logger.warn({ adminId, filename }, "Translation import received non-CSV filename");
    }

    const csvText = await file.text();
    const summary = await importTranslationCsv({
      adminId,
      csvText,
    });

    if (summary.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          summary,
          message: "Translation import validation failed.",
        },
        { status: 400 },
      );
    }

    logger.info(
      {
        adminId,
        totalRows: summary.totalRows,
        scriptsCreated: summary.scriptsCreated,
        scriptsUpdated: summary.scriptsUpdated,
        sentencesCreated: summary.sentencesCreated,
      },
      "Translation CSV import succeeded",
    );

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    logger.error({ error, adminId }, "Translation CSV import failed");
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
