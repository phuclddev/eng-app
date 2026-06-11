import { createHash } from "node:crypto";

import { validateTranslationCsv } from "@/lib/csv";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  TranslationImportSummary,
  TranslationRecallQuestionStat,
  TranslationScriptRecord,
  TranslationScriptSourceType,
  TranslationScriptSummary,
  TranslationSentenceRecord,
} from "@/lib/types";
import { prisma } from "@/server/prisma";

function coerceUsedChunkIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function asSourceType(value: string): TranslationScriptSourceType {
  return value === "SPEAKING_QUESTION" ? "SPEAKING_QUESTION" : "MANUAL";
}

type SentenceWithRelations = {
  id: string;
  orderIndex: number;
  englishText: string;
  vietnameseText: string;
  notes: string | null;
  reviews: Array<{
    reviewCount: number;
    lastConfidence: "EASY" | "MEDIUM" | "HARD" | null;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    lastReviewedAt: Date | null;
  }>;
  chunkMappings: Array<{
    id: string;
    englishPhrase: string;
    chunkId: string | null;
  }>;
};

function fingerprintScript(input: { title: string; topic: string }) {
  return createHash("sha1")
    .update(`${input.title.trim().toLowerCase()}::${input.topic.trim().toLowerCase()}`)
    .digest("hex");
}

function mapSentence(
  sentence: SentenceWithRelations,
): TranslationSentenceRecord {
  const review = sentence.reviews[0];

  return {
    id: sentence.id,
    orderIndex: sentence.orderIndex,
    englishText: sentence.englishText,
    vietnameseText: sentence.vietnameseText,
    notes: sentence.notes,
    review: review
      ? {
          reviewCount: review.reviewCount,
          lastConfidence: review.lastConfidence,
          easyCount: review.easyCount,
          mediumCount: review.mediumCount,
          hardCount: review.hardCount,
          lastReviewedAt: review.lastReviewedAt?.toISOString() ?? null,
        }
      : null,
    savedChunks: sentence.chunkMappings.map((mapping) => ({
      id: mapping.id,
      englishPhrase: mapping.englishPhrase,
      chunkId: mapping.chunkId,
    })),
  };
}

export async function listTranslationScripts(input: {
  userId: string;
}): Promise<TranslationScriptSummary[]> {
  const scripts = await prisma.translationScript.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      sentences: {
        select: {
          id: true,
          reviews: {
            where: { userId: input.userId },
            select: { reviewCount: true },
          },
        },
      },
    },
  });

  return scripts.map((script) => ({
    id: script.id,
    title: script.title,
    topic: script.topic,
    bandLevel: script.bandLevel,
    sentenceCount: script.sentences.length,
    reviewedCount: script.sentences.filter(
      (sentence) => sentence.reviews[0]?.reviewCount && sentence.reviews[0].reviewCount > 0,
    ).length,
    updatedAt: script.updatedAt.toISOString(),
    sourceType: asSourceType(script.sourceType),
    sourceQuestionId: script.sourceQuestionId,
    version: script.version,
    generatedByAi: script.generatedByAi,
  }));
}

export async function getTranslationScriptForUser(input: {
  userId: string;
  scriptId: string;
}): Promise<TranslationScriptRecord> {
  const script = await prisma.translationScript.findUnique({
    where: { id: input.scriptId },
    include: {
      sentences: {
        orderBy: { orderIndex: "asc" },
        include: {
          reviews: {
            where: { userId: input.userId },
          },
          chunkMappings: {
            select: {
              id: true,
              englishPhrase: true,
              chunkId: true,
            },
          },
        },
      },
    },
  });

  if (!script) {
    throw new NotFoundError("Translation script was not found.");
  }

  const usedChunkIds = coerceUsedChunkIds(script.usedChunkIds);
  const usedChunkRows =
    usedChunkIds.length === 0
      ? []
      : await prisma.chunk.findMany({
          where: { id: { in: usedChunkIds } },
          include: { topic: true },
        });
  const usedChunks = usedChunkRows.map((chunk) => ({
    id: chunk.id,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    topic: chunk.topic?.name ?? null,
    bandLevel: chunk.bandLevel,
  }));

  return {
    id: script.id,
    title: script.title,
    topic: script.topic,
    bandLevel: script.bandLevel,
    notes: script.notes,
    updatedAt: script.updatedAt.toISOString(),
    sentences: script.sentences.map((sentence) =>
      mapSentence(sentence as SentenceWithRelations),
    ),
    sourceType: asSourceType(script.sourceType),
    sourceQuestionId: script.sourceQuestionId,
    version: script.version,
    generatedByAi: script.generatedByAi,
    usedChunkIds,
    usedChunks,
  };
}

export async function getTranslationScriptStatsForQuestions(input: {
  questionIds: string[];
}): Promise<TranslationRecallQuestionStat[]> {
  if (input.questionIds.length === 0) {
    return [];
  }

  const scripts = await prisma.translationScript.findMany({
    where: {
      sourceQuestionId: { in: input.questionIds },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      sourceQuestionId: true,
      updatedAt: true,
    },
  });

  const stats = new Map<
    string,
    { scriptCount: number; latestScriptId: string | null; latestUpdatedAt: Date | null }
  >();

  for (const script of scripts) {
    if (!script.sourceQuestionId) {
      continue;
    }
    const current = stats.get(script.sourceQuestionId) ?? {
      scriptCount: 0,
      latestScriptId: null,
      latestUpdatedAt: null,
    };
    current.scriptCount += 1;

    if (
      !current.latestUpdatedAt ||
      script.updatedAt.getTime() > current.latestUpdatedAt.getTime()
    ) {
      current.latestUpdatedAt = script.updatedAt;
      current.latestScriptId = script.id;
    }

    stats.set(script.sourceQuestionId, current);
  }

  return input.questionIds.map((questionId) => {
    const value = stats.get(questionId);
    return {
      questionId,
      scriptCount: value?.scriptCount ?? 0,
      latestScriptId: value?.latestScriptId ?? null,
    };
  });
}

type ImportInput = {
  adminId: string;
  csvText: string;
};

export async function importTranslationCsv(
  input: ImportInput,
): Promise<TranslationImportSummary> {
  const validation = validateTranslationCsv(input.csvText);

  if (validation.totalRows === 0) {
    throw new ValidationError("Translation CSV is empty.");
  }

  if (validation.errors.length > 0) {
    return {
      scriptsCreated: 0,
      scriptsUpdated: 0,
      sentencesCreated: 0,
      totalRows: validation.totalRows,
      errors: validation.errors,
    };
  }

  type GroupedScript = {
    title: string;
    topic: string;
    bandLevel: number;
    sentences: Array<{
      englishText: string;
      vietnameseText: string;
    }>;
  };

  const grouped = new Map<string, GroupedScript>();

  for (const row of validation.rows) {
    const fingerprint = fingerprintScript({
      title: row.title,
      topic: row.topic,
    });
    const existing = grouped.get(fingerprint) ?? {
      title: row.title.trim(),
      topic: row.topic.trim(),
      bandLevel: row.bandLevel,
      sentences: [],
    };

    existing.sentences.push({
      englishText: row.englishText.trim(),
      vietnameseText: row.vietnameseText.trim(),
    });

    grouped.set(fingerprint, existing);
  }

  let scriptsCreated = 0;
  let scriptsUpdated = 0;
  let sentencesCreated = 0;
  const errors: TranslationImportSummary["errors"] = [];

  for (const [fingerprint, script] of grouped.entries()) {
    if (script.sentences.length === 0) {
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.translationScript.findUnique({
          where: { fingerprint },
        });

        let scriptId: string;

        if (existing) {
          await tx.translationScript.update({
            where: { id: existing.id },
            data: {
              title: script.title,
              topic: script.topic,
              bandLevel: script.bandLevel,
            },
          });
          await tx.translationSentence.deleteMany({
            where: { scriptId: existing.id },
          });
          scriptId = existing.id;
          scriptsUpdated += 1;
        } else {
          const created = await tx.translationScript.create({
            data: {
              title: script.title,
              topic: script.topic,
              bandLevel: script.bandLevel,
              fingerprint,
              createdById: input.adminId,
            },
          });
          scriptId = created.id;
          scriptsCreated += 1;
        }

        await tx.translationSentence.createMany({
          data: script.sentences.map((sentence, index) => ({
            scriptId,
            orderIndex: index,
            englishText: sentence.englishText,
            vietnameseText: sentence.vietnameseText,
          })),
        });

        sentencesCreated += script.sentences.length;
      });
    } catch (error) {
      errors.push({
        message:
          error instanceof Error
            ? `Failed to import script "${script.title}": ${error.message}`
            : `Failed to import script "${script.title}"`,
      });
    }
  }

  return {
    scriptsCreated,
    scriptsUpdated,
    sentencesCreated,
    totalRows: validation.totalRows,
    errors,
  };
}
