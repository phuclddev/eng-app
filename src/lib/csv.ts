import Papa from "papaparse";
import { z } from "zod";

import type { ChunkRecord } from "@/lib/types";
import {
  chunkCsvRowSchema,
  questionCsvRowSchema,
  translationCsvRowSchema,
} from "@/lib/validation";
import { ValidationError } from "@/lib/errors";

export type ChunkCsvRow = z.infer<typeof chunkCsvRowSchema>;
export type QuestionCsvRow = z.infer<typeof questionCsvRowSchema>;
export type TranslationCsvRow = z.infer<typeof translationCsvRowSchema>;

export type ChunkCsvValidationError = {
  message: string;
  rowNumber?: number;
};

function validateCsvRows<TRow>(
  csvText: string,
  schema: z.ZodType<TRow>,
) {
  const rows: TRow[] = [];
  const errors: ChunkCsvValidationError[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  for (const error of parsed.errors) {
    errors.push({
      message: error.message ?? "Unable to parse CSV.",
      rowNumber:
        typeof error.row === "number" ? error.row + 2 : undefined,
    });
  }

  parsed.data.forEach((row, index) => {
    const result = schema.safeParse(row);

    if (!result.success) {
      errors.push({
        rowNumber: index + 2,
        message: result.error.issues
          .map((issue) => issue.message)
          .join("; "),
      });
      return;
    }

    rows.push(result.data);
  });

  return {
    rows,
    errors,
    totalRows: parsed.data.length,
  };
}

export function validateChunkCsv(csvText: string) {
  return validateCsvRows(csvText, chunkCsvRowSchema);
}

export function parseChunkCsv(csvText: string) {
  const result = validateChunkCsv(csvText);

  if (result.errors.length > 0) {
    const firstError = result.errors[0];
    throw new ValidationError(
      firstError?.rowNumber
        ? `Row ${firstError.rowNumber}: ${firstError.message}`
        : (firstError?.message ?? "Unable to parse CSV."),
    );
  }

  return result.rows;
}

export function validateQuestionCsv(csvText: string) {
  return validateCsvRows(csvText, questionCsvRowSchema);
}

export function parseQuestionCsv(csvText: string) {
  const result = validateQuestionCsv(csvText);

  if (result.errors.length > 0) {
    const firstError = result.errors[0];
    throw new ValidationError(
      firstError?.rowNumber
        ? `Row ${firstError.rowNumber}: ${firstError.message}`
        : (firstError?.message ?? "Unable to parse CSV."),
    );
  }

  return result.rows;
}

export function validateTranslationCsv(csvText: string) {
  return validateCsvRows(csvText, translationCsvRowSchema);
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
