import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  IeltsQuestionGenerationSummary,
  IeltsQuestionRecord,
  IeltsTaskType,
  QuestionChunkUsageRole,
} from "@/lib/types";
import { clamp, normalizeText, toStringArray } from "@/lib/utils";
import type { IeltsQuestionGeneratePayload } from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildIeltsSpeakingQuestionGeneratorPrompt } from "@/server/ai/prompts/ielts-speaking-question-generator";
import {
  buildQuestionFingerprint,
  mapQuestionRecord,
  normalizeQuestionPrompt,
} from "@/server/data/questions";
import { prisma } from "@/server/prisma";

const HARD_CHUNK_LIMIT_PER_QUESTION = 6;
const EXISTING_PROMPT_SAMPLE = 80;
const EXISTING_CHUNK_SAMPLE = 60;

type ParsedQuestion = {
  taskType: IeltsTaskType;
  topic: string;
  subTopic: string | null;
  prompt: string;
  bullets: string[];
  difficulty: number;
  targetBand: number;
  recommendedChunks: string[];
  chunkRoles: QuestionChunkUsageRole[];
  popularityScore: number;
  predictedUsefulnessScore: number;
  aiReason: string | null;
};

const VALID_ROLES: ReadonlySet<QuestionChunkUsageRole> = new Set([
  "HOOK",
  "MAIN_IDEA",
  "SUPPORTING_DETAIL",
  "EXAMPLE",
  "OPINION",
  "CLOSING",
  "OPENING",
  "REASON",
  "CONTRAST",
  "DETAIL",
  "EMOTION",
  "STORYTELLING",
  "SPECULATION",
  "COMPARISON",
  "ENDING",
  "FILLER",
]);

const ROLE_ALIASES: Record<string, QuestionChunkUsageRole> = {
  HOOK: "OPENING",
  CLOSING: "ENDING",
  SUPPORTING_DETAIL: "DETAIL",
};

function extractJsonCandidate(answer: string) {
  const fencedMatch = answer.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = answer.indexOf("{");
  const lastBrace = answer.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return answer.slice(firstBrace, lastBrace + 1).trim();
  }
  return answer.trim();
}

function asTaskType(value: unknown): IeltsTaskType | null {
  if (typeof value !== "string") {
    return null;
  }
  const candidate = value.trim().toUpperCase();
  if (candidate === "PART_1" || candidate === "PART_2" || candidate === "PART_3") {
    return candidate;
  }
  return null;
}

function asChunkRole(value: unknown): QuestionChunkUsageRole | null {
  if (typeof value !== "string") {
    return null;
  }
  const candidate = value.trim().toUpperCase();
  if (candidate in ROLE_ALIASES) {
    return ROLE_ALIASES[candidate]!;
  }
  return VALID_ROLES.has(candidate as QuestionChunkUsageRole)
    ? (candidate as QuestionChunkUsageRole)
    : null;
}

function parseGeneratorAnswer(answer: string): ParsedQuestion[] {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJsonCandidate(answer));
  } catch {
    throw new AppError(
      "AI returned an invalid question generator response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { questions?: unknown }).questions)
      ? ((raw as { questions: unknown[] }).questions)
      : Array.isArray(raw)
        ? raw
        : null;

  if (!list || list.length === 0) {
    throw new AppError(
      "AI returned no questions.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const parsed: ParsedQuestion[] = [];

  for (const candidate of list) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const taskType = asTaskType(record.part);
    const prompt =
      typeof record.prompt === "string" ? record.prompt.trim() : "";
    const topic =
      typeof record.topic === "string" ? record.topic.trim() : "";

    if (!taskType || prompt.length < 5 || topic.length < 2) {
      continue;
    }

    const subTopic =
      typeof record.subTopic === "string" && record.subTopic.trim().length > 0
        ? record.subTopic.trim().slice(0, 120)
        : null;

    const bullets: string[] = [];
    if (taskType === "PART_2") {
      for (const key of ["bullet_1", "bullet_2", "bullet_3", "bullet_4"] as const) {
        const value = record[key];
        if (typeof value === "string" && value.trim().length > 0) {
          bullets.push(value.trim());
        }
      }
    }

    const difficultyRaw =
      typeof record.difficulty === "number"
        ? record.difficulty
        : Number(record.difficulty);
    const difficulty = Number.isFinite(difficultyRaw)
      ? clamp(Math.round(difficultyRaw), 1, 5)
      : 2;

    const targetBandRaw =
      typeof record.targetBand === "number"
        ? record.targetBand
        : Number(record.targetBand);
    const targetBand = Number.isFinite(targetBandRaw)
      ? clamp(targetBandRaw, 4, 9)
      : 6;

    const recommendedChunksRaw = Array.isArray(record.recommendedChunks)
      ? record.recommendedChunks
      : [];
    const recommendedChunks = recommendedChunksRaw
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      .map((value) => value.trim())
      .slice(0, HARD_CHUNK_LIMIT_PER_QUESTION);

    const rolesRaw = Array.isArray(record.chunkRoles) ? record.chunkRoles : [];
    const chunkRoles = recommendedChunks.map((_, index) => {
      const resolved = asChunkRole(rolesRaw[index]);
      return resolved ?? "DETAIL";
    });

    const popularityRaw =
      typeof record.popularityScore === "number"
        ? record.popularityScore
        : Number(record.popularityScore);
    const usefulnessRaw =
      typeof record.predictedUsefulnessScore === "number"
        ? record.predictedUsefulnessScore
        : Number(record.predictedUsefulnessScore);

    parsed.push({
      taskType,
      topic: topic.slice(0, 120),
      subTopic,
      prompt: prompt.slice(0, 4000),
      bullets,
      difficulty,
      targetBand,
      recommendedChunks,
      chunkRoles,
      popularityScore: Number.isFinite(popularityRaw)
        ? clamp(Math.round(popularityRaw), 1, 5)
        : 3,
      predictedUsefulnessScore: Number.isFinite(usefulnessRaw)
        ? clamp(Math.round(usefulnessRaw), 1, 5)
        : 3,
      aiReason:
        typeof record.aiReason === "string" && record.aiReason.trim().length > 0
          ? record.aiReason.trim().slice(0, 1200)
          : null,
    });
  }

  if (parsed.length === 0) {
    throw new AppError(
      "AI did not return any usable questions.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  return parsed;
}

async function loadExistingPromptLines(): Promise<string[]> {
  const rows = await prisma.ieltsQuestion.findMany({
    select: {
      taskType: true,
      topic: true,
      prompt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: EXISTING_PROMPT_SAMPLE,
  });
  return rows.map(
    (row) => `[${row.taskType}] ${row.topic}: ${row.prompt.slice(0, 160)}`,
  );
}

async function loadExistingChunkLines(): Promise<string[]> {
  const chunks = await prisma.chunk.findMany({
    where: { deletedAt: null },
    select: { chunk: true, meaningVi: true },
    orderBy: [{ bandLevel: "desc" }, { updatedAt: "desc" }],
    take: EXISTING_CHUNK_SAMPLE,
  });
  return chunks.map((chunk) => `${chunk.chunk} = ${chunk.meaningVi}`);
}

type ChunkLookup = Map<string, { id: string; chunk: string }>;

async function buildChunkLookup(chunkTexts: string[]): Promise<ChunkLookup> {
  const lookup: ChunkLookup = new Map();
  if (chunkTexts.length === 0) {
    return lookup;
  }

  const normalizedSet = new Set(chunkTexts.map((text) => normalizeText(text)));
  const rows = await prisma.chunk.findMany({
    where: { deletedAt: null },
    select: { id: true, chunk: true },
  });

  for (const row of rows) {
    const key = normalizeText(row.chunk);
    if (normalizedSet.has(key)) {
      lookup.set(key, { id: row.id, chunk: row.chunk });
    }
  }

  return lookup;
}

export async function generateIeltsSpeakingQuestions(input: {
  actorId: string;
  payload: IeltsQuestionGeneratePayload;
}): Promise<IeltsQuestionGenerationSummary> {
  const batchId = randomUUID();
  const warnings: string[] = [];
  const parseErrors: string[] = [];

  const [existingPromptLines, existingChunkLines, existingNormalized] = await Promise.all([
    loadExistingPromptLines(),
    input.payload.includeRecommendedChunks
      ? loadExistingChunkLines()
      : Promise.resolve<string[]>([]),
    prisma.ieltsQuestion.findMany({
      select: { skill: true, taskType: true, normalizedPrompt: true },
    }),
  ]);

  const dedupeKeys = new Set(
    existingNormalized.map(
      (row) => `${row.skill}::${row.taskType}::${row.normalizedPrompt}`,
    ),
  );

  const targetBand = input.payload.targetBand ?? 6.5;

  let aiAnswer: string;
  try {
    const response = await callAiTutor({
      query: buildIeltsSpeakingQuestionGeneratorPrompt({
        part: input.payload.part,
        topic: input.payload.topic ?? null,
        count: input.payload.count,
        targetBand,
        includeRecommendedChunks: input.payload.includeRecommendedChunks,
        existingPromptLines,
        chunkLibraryLines: existingChunkLines,
      }),
    });
    aiAnswer = response.answer;
  } catch (error) {
    logger.warn(
      {
        actorId: input.actorId,
        batchId,
        error: error instanceof Error ? error.message : "unknown",
      },
      "IELTS question generator AI call failed",
    );
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "IELTS question generation is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const parsedQuestions = parseGeneratorAnswer(aiAnswer);

  let skippedDuplicates = 0;
  const acceptedQuestions: ParsedQuestion[] = [];
  const seenInBatch = new Set<string>();

  for (const candidate of parsedQuestions) {
    if (
      input.payload.part !== "MIXED" &&
      candidate.taskType !== input.payload.part
    ) {
      continue;
    }
    const normalizedPrompt = normalizeQuestionPrompt(candidate.prompt);
    if (!normalizedPrompt) {
      continue;
    }
    const key = `SPEAKING::${candidate.taskType}::${normalizedPrompt}`;
    if (dedupeKeys.has(key) || seenInBatch.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    seenInBatch.add(key);
    acceptedQuestions.push(candidate);
  }

  if (acceptedQuestions.length === 0) {
    warnings.push(
      "No new questions were generated. Try a different topic, count, or wait and regenerate.",
    );
    return {
      batchId,
      created: 0,
      skippedDuplicates,
      parseErrors,
      warnings,
      questions: [],
    };
  }

  const chunkLookup = input.payload.includeRecommendedChunks
    ? await buildChunkLookup(
        acceptedQuestions.flatMap((question) => question.recommendedChunks),
      )
    : new Map<string, { id: string; chunk: string }>();

  const createdRecords: IeltsQuestionRecord[] = [];

  for (const candidate of acceptedQuestions) {
    const normalizedPrompt = normalizeQuestionPrompt(candidate.prompt);
    const fingerprint = buildQuestionFingerprint({
      skill: "SPEAKING",
      taskType: candidate.taskType,
      topic: candidate.topic,
      subTopic: candidate.subTopic ?? null,
      prompt: candidate.prompt,
    });
    const supportingPoints =
      candidate.taskType === "PART_2" ? candidate.bullets : [];

    try {
      const created = await prisma.$transaction(async (tx) => {
        const question = await tx.ieltsQuestion.create({
          data: {
            skill: "SPEAKING",
            taskType: candidate.taskType,
            topic: candidate.topic,
            subTopic: candidate.subTopic,
            prompt: candidate.prompt,
            normalizedPrompt,
            supportingPoints,
            difficulty: candidate.difficulty,
            targetBand: candidate.targetBand,
            fingerprint,
            status: "SUGGESTED",
            source: "AI_GENERATED",
            aiReason: candidate.aiReason,
            popularityScore: candidate.popularityScore,
            predictedUsefulnessScore: candidate.predictedUsefulnessScore,
            generatedBatchId: batchId,
            createdById: input.actorId,
          },
        });

        if (
          input.payload.includeRecommendedChunks &&
          candidate.recommendedChunks.length > 0
        ) {
          const mappingPayload = candidate.recommendedChunks
            .map((chunkText, index) => {
              const key = normalizeText(chunkText);
              const match = chunkLookup.get(key);
              if (!match) {
                return null;
              }
              return {
                questionId: question.id,
                chunkId: match.id,
                usageRole: candidate.chunkRoles[index] ?? "DETAIL",
                exampleSentence: null,
                sortOrder: index,
              };
            })
            .filter(
              (
                value,
              ): value is {
                questionId: string;
                chunkId: string;
                usageRole: QuestionChunkUsageRole;
                exampleSentence: null;
                sortOrder: number;
              } => Boolean(value),
            );

          for (const mapping of mappingPayload) {
            try {
              await tx.ieltsQuestionChunkMapping.create({
                data: mapping,
              });
            } catch {
              // ignore duplicate role mappings; the unique key already enforces uniqueness
            }
          }
        }

        return tx.ieltsQuestion.findUnique({
          where: { id: question.id },
          include: {
            chunkMappings: {
              where: { chunk: { deletedAt: null } },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              include: { chunk: { include: { topic: true } } },
            },
          },
        });
      });

      if (created) {
        createdRecords.push(mapQuestionRecord(created));
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown error";
      parseErrors.push(
        `Could not save question "${candidate.prompt.slice(0, 80)}": ${message}`,
      );
    }
  }

  if (parsedQuestions.length > acceptedQuestions.length + skippedDuplicates) {
    warnings.push(
      `${
        parsedQuestions.length - acceptedQuestions.length - skippedDuplicates
      } AI suggestions were dropped because they did not match the requested part filter.`,
    );
  }

  if (
    input.payload.includeRecommendedChunks &&
    acceptedQuestions.some(
      (question) =>
        question.recommendedChunks.length > 0 &&
        question.recommendedChunks.some(
          (text) => !chunkLookup.has(normalizeText(text)),
        ),
    )
  ) {
    warnings.push(
      "Some recommended chunks were not found in the Chunk Library and were left unmapped. Add them manually if useful.",
    );
  }

  logger.info(
    {
      actorId: input.actorId,
      batchId,
      requested: input.payload.count,
      parsed: parsedQuestions.length,
      created: createdRecords.length,
      skippedDuplicates,
    },
    "IELTS question generation completed",
  );

  return {
    batchId,
    created: createdRecords.length,
    skippedDuplicates,
    parseErrors,
    warnings,
    questions: createdRecords,
  };
}

export async function setIeltsQuestionStatus(input: {
  questionId: string;
  status: "SUGGESTED" | "APPROVED" | "ARCHIVED";
  actorId: string;
}) {
  const existing = await prisma.ieltsQuestion.findUnique({
    where: { id: input.questionId },
  });
  if (!existing) {
    throw new AppError("Question was not found.", 404, "NOT_FOUND");
  }

  const updated = await prisma.ieltsQuestion.update({
    where: { id: input.questionId },
    data: { status: input.status },
    include: {
      chunkMappings: {
        where: { chunk: { deletedAt: null } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { chunk: { include: { topic: true } } },
      },
    },
  });

  return mapQuestionRecord(updated);
}

export async function bulkSetIeltsQuestionStatus(input: {
  questionIds: string[];
  status: "SUGGESTED" | "APPROVED" | "ARCHIVED";
  actorId: string;
}) {
  const uniqueIds = [...new Set(input.questionIds)];

  const existing = await prisma.ieltsQuestion.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true },
  });

  if (existing.length !== uniqueIds.length) {
    throw new AppError(
      "One or more questions were not found.",
      404,
      "NOT_FOUND",
    );
  }

  await prisma.ieltsQuestion.updateMany({
    where: { id: { in: uniqueIds } },
    data: { status: input.status },
  });

  const updated = await prisma.ieltsQuestion.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      chunkMappings: {
        where: { chunk: { deletedAt: null } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { chunk: { include: { topic: true } } },
      },
    },
  });

  void toStringArray;
  return updated.map(mapQuestionRecord);
}
