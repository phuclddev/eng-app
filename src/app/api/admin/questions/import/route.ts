import { NextResponse } from "next/server";

import { getErrorResponse } from "@/lib/errors";
import { requireAdminApiSession } from "@/server/auth";
import { importQuestionsFromCsv } from "@/server/question-import";

export async function POST(request: Request) {
  try {
    const session = await requireAdminApiSession();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "FILE_REQUIRED", message: "A CSV file is required." },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const summary = await importQuestionsFromCsv({
      actorId: session.user.id,
      csvText,
    });

    if (summary.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Question import validation failed.",
          summary,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
