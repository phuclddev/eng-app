import Papa from "papaparse";

import type { ChunkRecord } from "@/lib/types";
import { chunkCsvRowSchema } from "@/lib/validation";

export function parseChunkCsv(csvText: string) {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Unable to parse CSV.");
  }

  return parsed.data.map((row) => chunkCsvRowSchema.parse(row));
}

export function exportChunksToCsv(chunks: ChunkRecord[]) {
  return Papa.unparse(
    chunks.map((chunk) => ({
      chunk: chunk.chunk,
      meaning: chunk.meaningVi,
      example: chunk.example,
      topic: chunk.topic?.name ?? "",
      difficulty: chunk.difficulty,
      band_level: chunk.bandLevel,
      grammar_pattern: chunk.grammarPattern ?? "",
      tags: chunk.tags.join(", "),
      notes: chunk.notes ?? "",
      wrong_examples: chunk.wrongExamples.join(" | "),
    })),
  );
}
