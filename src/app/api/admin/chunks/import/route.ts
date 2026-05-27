import { NextResponse } from "next/server";

import { parseChunkCsv } from "@/lib/csv";
import { getErrorResponse } from "@/lib/errors";
import { ensureTopicByName, saveChunk } from "@/server/data/chunks";
import { requireAdminApiSession } from "@/server/auth";

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
    const rows = parseChunkCsv(csvText);

    for (const row of rows) {
      const topicId = row.topic ? await ensureTopicByName(row.topic) : null;

      await saveChunk(
        {
          chunk: row.chunk,
          meaningVi: row.meaning,
          example: row.example,
          wrongExamples: row.wrong_examples
            .split("|")
            .map((item) => item.trim())
            .filter(Boolean),
          difficulty: row.difficulty,
          bandLevel: row.band_level,
          grammarPattern: row.grammar_pattern || null,
          tags: row.tags
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          notes: row.notes || null,
          topicId,
        },
        session.user.id,
      );
    }

    return NextResponse.json({
      ok: true,
      imported: rows.length,
    });
  } catch (error) {
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
