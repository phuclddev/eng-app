import { createHash } from "node:crypto";

import { validateTranslationCsv } from "@/lib/csv";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import type {
  TranslationImportSummary,
  TranslationRecallQuestionStat,
  TranslationScriptRecord,
  TranslationScriptSourceType,
  TranslationScriptSummary,
  TranslationSentenceRecord,
} from "@/lib/types";
import type {
  TranslationScriptCreatePayload,
  TranslationScriptUpdatePayload,
} from "@/lib/validation";
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

async function loadFullScriptRecord(scriptId: string): Promise<TranslationScriptRecord> {
  const script = await prisma.translationScript.findUnique({
    where: { id: scriptId },
    include: {
      sentences: {
        orderBy: { orderIndex: "asc" },
        include: {
          reviews: false as never,
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
    sentences: script.sentences.map((sentence) => ({
      id: sentence.id,
      orderIndex: sentence.orderIndex,
      englishText: sentence.englishText,
      vietnameseText: sentence.vietnameseText,
      notes: sentence.notes,
      review: null,
      savedChunks: sentence.chunkMappings.map((mapping) => ({
        id: mapping.id,
        englishPhrase: mapping.englishPhrase,
        chunkId: mapping.chunkId,
      })),
    })) as TranslationSentenceRecord[],
    sourceType: asSourceType(script.sourceType),
    sourceQuestionId: script.sourceQuestionId,
    version: script.version,
    generatedByAi: script.generatedByAi,
    usedChunkIds,
    usedChunks,
  };
}

export async function createTranslationScript(input: {
  adminId: string;
  payload: TranslationScriptCreatePayload;
}): Promise<TranslationScriptRecord> {
  const trimmedTitle = input.payload.title.trim();
  const trimmedTopic = input.payload.topic.trim();
  const fingerprint = fingerprintScript({
    title: trimmedTitle,
    topic: trimmedTopic,
  });

  const existing = await prisma.translationScript.findUnique({
    where: { fingerprint },
  });

  if (existing) {
    throw new AppError(
      `A script with title "${trimmedTitle}" and topic "${trimmedTopic}" already exists.`,
      409,
      "TRANSLATION_SCRIPT_DUPLICATE",
    );
  }

  if (input.payload.sentences.length === 0) {
    throw new ValidationError("At least one sentence pair is required.");
  }

  const scriptId = await prisma.$transaction(async (tx) => {
    const created = await tx.translationScript.create({
      data: {
        title: trimmedTitle,
        topic: trimmedTopic,
        bandLevel: input.payload.bandLevel,
        notes: input.payload.notes ?? null,
        fingerprint,
        sourceType: "MANUAL",
        generatedByAi: false,
        createdById: input.adminId,
      },
    });

    await tx.translationSentence.createMany({
      data: input.payload.sentences.map((pair, index) => ({
        scriptId: created.id,
        orderIndex: index,
        englishText: pair.english.trim(),
        vietnameseText: pair.vietnamese.trim(),
      })),
    });

    return created.id;
  });

  return loadFullScriptRecord(scriptId);
}

export async function updateTranslationScript(input: {
  adminId: string;
  scriptId: string;
  payload: TranslationScriptUpdatePayload;
}): Promise<TranslationScriptRecord> {
  const existing = await prisma.translationScript.findUnique({
    where: { id: input.scriptId },
    select: { id: true, fingerprint: true },
  });

  if (!existing) {
    throw new NotFoundError("Translation script was not found.");
  }

  const trimmedTitle = input.payload.title.trim();
  const trimmedTopic = input.payload.topic.trim();
  const nextFingerprint = fingerprintScript({
    title: trimmedTitle,
    topic: trimmedTopic,
  });

  if (nextFingerprint !== existing.fingerprint) {
    const conflict = await prisma.translationScript.findUnique({
      where: { fingerprint: nextFingerprint },
      select: { id: true },
    });

    if (conflict && conflict.id !== input.scriptId) {
      throw new AppError(
        `A script with title "${trimmedTitle}" and topic "${trimmedTopic}" already exists.`,
        409,
        "TRANSLATION_SCRIPT_DUPLICATE",
      );
    }
  }

  if (input.payload.sentences.length === 0) {
    throw new ValidationError("At least one sentence pair is required.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.translationScript.update({
      where: { id: input.scriptId },
      data: {
        title: trimmedTitle,
        topic: trimmedTopic,
        bandLevel: input.payload.bandLevel,
        notes: input.payload.notes ?? null,
        fingerprint: nextFingerprint,
      },
    });

    await tx.translationSentence.deleteMany({
      where: { scriptId: input.scriptId },
    });

    await tx.translationSentence.createMany({
      data: input.payload.sentences.map((pair, index) => ({
        scriptId: input.scriptId,
        orderIndex: index,
        englishText: pair.english.trim(),
        vietnameseText: pair.vietnamese.trim(),
      })),
    });
  });

  return loadFullScriptRecord(input.scriptId);
}

export async function deleteTranslationScript(input: {
  adminId: string;
  scriptId: string;
}): Promise<{ ok: true; scriptId: string }> {
  const existing = await prisma.translationScript.findUnique({
    where: { id: input.scriptId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Translation script was not found.");
  }

  await prisma.translationScript.delete({
    where: { id: input.scriptId },
  });

  return { ok: true, scriptId: input.scriptId };
}
