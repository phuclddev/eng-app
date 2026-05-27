import { NextResponse } from "next/server";

import { exportChunksToCsv } from "@/lib/csv";
import { getErrorResponse } from "@/lib/errors";
import { getChunkLibrary } from "@/server/data/chunks";
import { requireAdminApiSession } from "@/server/auth";

export async function GET() {
  try {
    await requireAdminApiSession();
    const chunks = await getChunkLibrary();
    const csv = exportChunksToCsv(chunks);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ielts-chunks.csv"',
      },
    });
  } catch (error) {
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
