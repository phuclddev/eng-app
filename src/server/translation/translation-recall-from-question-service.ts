import { createHash } from "node:crypto";

import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  IeltsTaskType,
  TranslationRecallFromQuestionResponse,
  TranslationRecallUsedChunkRecord,
} from "@/lib/types";
import { toStringArray } from "@/lib/utils";
import type { TranslationFromQuestionPayload } from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildTranslationRecallFromQuestionPrompt } from "@/server/ai/prompts/translation-recall-from-question";
import {
  selectSampleAnswerChunks,
  type SampleAnswerChunkCandidate,
} from "@/server/ai/sample-answer-selection";
import { prisma } from "@/server/prisma";

type IeltsQuestionWithChunks = Awaited<
  ReturnType<typeof loadQuestionWithMappings>
>;

type ChunkRow = {
  id: string;
  chunk: string;
  meaningVi: string;
  bandLevel: number;
  example: string;
  topic: { name: string } | null;
};

const TRANSLATION_RECALL_HARD_CHUNK_LIMIT = 30;

function loadQuestionWithMappings(speakingQuestionId: string) {
  return prisma.ieltsQuestion.findUnique({
    where: { id: speakingQuestionId },
    include: {
      chunkMappings: {
        where: { chunk: { deletedAt: null } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          chunk: {
            include: { topic: true },
          },
        },
      },
    },
  });
}

async function loadTopicChunkPool(input: {
  excludeChunkIds: string[];
  topic: string;
  subTopic: string | null;
  take: number;
}): Promise<ChunkRow[]> {
  return prisma.chunk.findMany({
    where: {
      deletedAt: null,
      id: { notIn: input.excludeChunkIds },
      topic: {
        OR: [
          { name: { contains: input.topic } },
          ...(input.subTopic
            ? [{ name: { contains: input.subTopic } }]
            : []),
        ],
      },
    },
    include: { topic: true },
    orderBy: [{ updatedAt: "desc" }, { chunk: "asc" }],
    take: input.take,
  });
}

async function loadGeneralChunkPool(input: {
  excludeChunkIds: string[];
  take: number;
}): Promise<ChunkRow[]> {
  return prisma.chunk.findMany({
    where: {
      deletedAt: null,
      id: { notIn: input.excludeChunkIds },
    },
    include: { topic: true },
    orderBy: [{ bandLevel: "desc" }, { updatedAt: "desc" }],
    take: input.take,
  });
}

function asCandidate(
  chunk: ChunkRow,
  source: "GENERAL" | "RECOMMENDED" | "TOPIC",
  usageRole: SampleAnswerChunkCandidate["usageRole"] = null,
  sortOrder?: number,
): SampleAnswerChunkCandidate {
  return {
    id: chunk.id,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    topic: chunk.topic?.name ?? null,
    bandLevel: chunk.bandLevel,
    usageRole,
    example: chunk.example,
    source,
    sortOrder,
  };
}

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

type ParsedAiResponse = {
  title: string;
  englishAnswer: string;
  vietnameseTranslation: string;
  sentences: Array<{ english: string; vietnamese: string }>;
  usedChunks: string[];
};

function parseAiResponse(input: {
  answer: string;
  fallbackTitle: string;
}): { parsed: ParsedAiResponse | null; warnings: string[] } {
  const warnings: string[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(extractJsonCandidate(input.answer));
  } catch {
    warnings.push("AI response was not valid JSON; falling back to plain text.");
    const cleaned = input.answer.trim();
    if (!cleaned) {
      return { parsed: null, warnings };
    }
    return {
      parsed: {
        title: input.fallbackTitle,
        englishAnswer: cleaned,
        vietnameseTranslation: "",
        sentences: [],
        usedChunks: [],
      },
      warnings,
    };
  }

  if (!raw || typeof raw !== "object") {
    warnings.push("AI response was not a JSON object.");
    return { parsed: null, warnings };
  }

  const record = raw as Record<string, unknown>;
  const title =
    typeof record.title === "string" && record.title.trim().length > 0
      ? record.title.trim().slice(0, 191)
      : input.fallbackTitle;
  const englishAnswer =
    typeof record.englishAnswer === "string"
      ? record.englishAnswer.trim()
      : "";
  const vietnameseTranslation =
    typeof record.vietnameseTranslation === "string"
      ? record.vietnameseTranslation.trim()
      : "";

  const sentencesRaw = Array.isArray(record.sentences) ? record.sentences : [];
  const sentences = sentencesRaw
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === "object",
    )
    .map((item) => ({
      english:
        typeof item.english === "string" ? item.english.trim() : "",
      vietnamese:
        typeof item.vietnamese === "string" ? item.vietnamese.trim() : "",
    }))
    .filter((pair) => pair.english.length > 0 && pair.vietnamese.length > 0);

  const usedChunks = Array.isArray(record.usedChunks)
    ? record.usedChunks.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];

  if (!englishAnswer) {
    warnings.push("AI response had no englishAnswer text.");
    return { parsed: null, warnings };
  }

  if (sentences.length === 0) {
    warnings.push(
      "AI response had no aligned sentences; falling back to whole-script split.",
    );
  }

  if (!vietnameseTranslation && sentences.length > 0) {
    warnings.push(
      "AI response was missing vietnameseTranslation; joining aligned sentences instead.",
    );
  }

  const joinedEnglish =
    sentences.length > 0
      ? sentences.map((pair) => pair.english).join(" ")
      : englishAnswer;
  const joinedVietnamese =
    sentences.length > 0 && !vietnameseTranslation
      ? sentences.map((pair) => pair.vietnamese).join(" ")
      : vietnameseTranslation;

  return {
    parsed: {
      title,
      englishAnswer: joinedEnglish.trim(),
      vietnameseTranslation: joinedVietnamese.trim(),
      sentences,
      usedChunks,
    },
    warnings,
  };
}

function matchUsedChunks(input: {
  englishAnswer: string;
  declared: string[];
  selectedChunks: SampleAnswerChunkCandidate[];
}): TranslationRecallUsedChunkRecord[] {
  const normalized = input.englishAnswer.toLowerCase();
  const declaredLower = new Set(input.declared.map((value) => value.toLowerCase()));
  const seen = new Set<string>();
  const used: TranslationRecallUsedChunkRecord[] = [];

  for (const chunk of input.selectedChunks) {
    const chunkLower = chunk.chunk.toLowerCase();
    if (seen.has(chunk.id)) {
      continue;
    }
    if (declaredLower.has(chunkLower) || normalized.includes(chunkLower)) {
      seen.add(chunk.id);
      used.push({
        id: chunk.id,
        chunk: chunk.chunk,
        meaningVi: chunk.meaningVi,
        topic: chunk.topic,
        bandLevel: chunk.bandLevel,
      });
    }
  }

  return used;
}

function splitFallbackSentences(
  englishAnswer: string,
  vietnameseTranslation: string,
): Array<{ english: string; vietnamese: string }> {
  const englishSentences = englishAnswer
    .split(/(?<=[.!?])\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const vietnameseSentences = vietnameseTranslation
    ? vietnameseTranslation
        .split(/(?<=[.!?…])\s+/)
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  const pairs: Array<{ english: string; vietnamese: string }> = [];
  const length = Math.max(englishSentences.length, vietnameseSentences.length);

  for (let index = 0; index < length; index += 1) {
    const english = englishSentences[index] ?? englishAnswer;
    const vietnamese = vietnameseSentences[index] ?? "";

    pairs.push({
      english,
      vietnamese: vietnamese.length > 0 ? vietnamese : "(Vietnamese translation pending)",
    });
  }

  if (pairs.length === 0) {
    pairs.push({
      english: englishAnswer,
      vietnamese:
        vietnameseTranslation || "(Vietnamese translation pending)",
    });
  }

  return pairs;
}

function deriveTitle(input: {
  topic: string;
  taskType: IeltsTaskType;
  promptText: string;
  version: number;
  aiTitle: string | null;
}) {
  const cleanPrompt = input.promptText.replace(/\s+/g, " ").trim();
  const promptShort =
    cleanPrompt.length <= 80 ? cleanPrompt : `${cleanPrompt.slice(0, 77)}…`;
  const base = input.aiTitle
    ? input.aiTitle
    : `${input.topic} · ${input.taskType} · ${promptShort}`;

  return input.version > 1 ? `${base} (v${input.version})` : base;
}

function buildFingerprint(input: {
  speakingQuestionId: string;
  targetBand: number;
  version: number;
}) {
  return createHash("sha1")
    .update(
      `tr-recall::${input.speakingQuestionId}::${input.targetBand.toFixed(1)}::v${input.version}`,
    )
    .digest("hex");
}

async function findExistingScript(input: {
  speakingQuestionId: string;
  targetBand: number;
}) {
  return prisma.translationScript.findFirst({
    where: {
      sourceQuestionId: input.speakingQuestionId,
      bandLevel: input.targetBand,
    },
    orderBy: { version: "desc" },
    include: {
      _count: { select: { sentences: true } },
    },
  });
}

export async function generateTranslationRecallFromQuestion(input: {
  userId: string;
  payload: TranslationFromQuestionPayload;
}): Promise<TranslationRecallFromQuestionResponse> {
  const question = (await loadQuestionWithMappings(
    input.payload.speakingQuestionId,
  )) as IeltsQuestionWithChunks;

  if (!question) {
    throw new NotFoundError("Speaking question was not found.");
  }

  const targetBand = input.payload.targetBand ?? question.targetBand;
  const length = input.payload.length;
  const maxChunks = Math.min(
    input.payload.maxChunks,
    TRANSLATION_RECALL_HARD_CHUNK_LIMIT,
  );

  const existing = await findExistingScript({
    speakingQuestionId: question.id,
    targetBand,
  });

  if (existing && !input.payload.regenerate) {
    const usedChunkIds = Array.isArray(existing.usedChunkIds)
      ? (existing.usedChunkIds as unknown[]).filter(
          (item): item is string => typeof item === "string",
        )
      : [];

    const usedChunkRows =
      usedChunkIds.length > 0
        ? await prisma.chunk.findMany({
            where: { id: { in: usedChunkIds } },
            include: { topic: true },
          })
        : [];

    return {
      script: {
        id: existing.id,
        title: existing.title,
        topic: existing.topic,
        bandLevel: existing.bandLevel,
        version: existing.version,
        sentenceCount: existing._count.sentences,
        sourceQuestionId: question.id,
      },
      usedChunks: usedChunkRows.map((chunk) => ({
        id: chunk.id,
        chunk: chunk.chunk,
        meaningVi: chunk.meaningVi,
        topic: chunk.topic?.name ?? null,
        bandLevel: chunk.bandLevel,
      })),
      englishMarkdown: "",
      vietnameseText: "",
      duplicate: true,
      fallbackUsed: false,
      warnings: [],
    };
  }

  const recommendedChunks = question.chunkMappings.map((mapping) =>
    asCandidate(mapping.chunk, "RECOMMENDED", mapping.usageRole, mapping.sortOrder),
  );

  const mappedChunkIds = recommendedChunks.map((chunk) => chunk.id);

  const sameTopicChunkRows = input.payload.includeChunkLibrary
    ? await loadTopicChunkPool({
        excludeChunkIds: mappedChunkIds,
        topic: question.topic,
        subTopic: question.subTopic,
        take: Math.max(maxChunks * 2, 24),
      })
    : [];
  const sameTopicChunks = sameTopicChunkRows.map((chunk) =>
    asCandidate(chunk, "TOPIC"),
  );

  const generalChunkRows = input.payload.includeChunkLibrary
    ? await loadGeneralChunkPool({
        excludeChunkIds: [
          ...mappedChunkIds,
          ...sameTopicChunks.map((chunk) => chunk.id),
        ],
        take: Math.max(maxChunks * 2, 30),
      })
    : [];
  const generalChunks = generalChunkRows.map((chunk) =>
    asCandidate(chunk, "GENERAL"),
  );

  const selectedChunks = selectSampleAnswerChunks({
    recommendedChunks,
    sameTopicChunks,
    generalChunks,
    maxChunks,
    targetBand,
    topic: question.topic,
    subTopic: question.subTopic,
  }).slice(0, TRANSLATION_RECALL_HARD_CHUNK_LIMIT);

  const promptQuery = buildTranslationRecallFromQuestionPrompt({
    taskType: question.taskType as IeltsTaskType,
    topic: question.topic,
    subTopic: question.subTopic,
    prompt: question.prompt,
    supportingPoints: toStringArray(question.supportingPoints),
    targetBand,
    length,
    chunkLines: selectedChunks.map((chunk) => ({
      chunk: chunk.chunk,
      meaningVi: chunk.meaningVi,
      source: chunk.source,
      topic: chunk.topic,
    })),
  });

  let aiAnswer: string;

  try {
    const response = await callAiTutor({ query: promptQuery });
    aiAnswer = response.answer;
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        speakingQuestionId: question.id,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Translation Recall from-question AI call failed",
    );
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Translation Recall AI is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const fallbackTitle = `${question.topic} · ${question.taskType}`;
  const { parsed, warnings } = parseAiResponse({
    answer: aiAnswer,
    fallbackTitle,
  });

  if (!parsed) {
    throw new AppError(
      "AI returned an empty Translation Recall response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  let fallbackUsed = parsed.sentences.length === 0;
  const sentences =
    parsed.sentences.length > 0
      ? parsed.sentences
      : splitFallbackSentences(
          parsed.englishAnswer,
          parsed.vietnameseTranslation,
        );

  if (
    parsed.sentences.length === 0 ||
    sentences.some((pair) => pair.vietnamese === "(Vietnamese translation pending)")
  ) {
    fallbackUsed = true;
  }

  const usedChunks = matchUsedChunks({
    englishAnswer: parsed.englishAnswer,
    declared: parsed.usedChunks,
    selectedChunks,
  });

  const version = existing ? existing.version + 1 : 1;
  const fingerprint = buildFingerprint({
    speakingQuestionId: question.id,
    targetBand,
    version,
  });

  const title = deriveTitle({
    topic: question.topic,
    taskType: question.taskType as IeltsTaskType,
    promptText: question.prompt,
    version,
    aiTitle: parsed.title,
  });

  const created = await prisma.$transaction(async (tx) => {
    const script = await tx.translationScript.create({
      data: {
        title,
        topic: question.topic,
        bandLevel: targetBand,
        fingerprint,
        sourceType: "SPEAKING_QUESTION",
        sourceQuestionId: question.id,
        generatedByAi: true,
        version,
        usedChunkIds: usedChunks.map((chunk) => chunk.id),
        createdById: input.userId,
      },
    });

    await tx.translationSentence.createMany({
      data: sentences.map((pair, index) => ({
        scriptId: script.id,
        orderIndex: index,
        englishText: pair.english,
        vietnameseText: pair.vietnamese,
      })),
    });

    return script;
  });

  return {
    script: {
      id: created.id,
      title: created.title,
      topic: created.topic,
      bandLevel: created.bandLevel,
      version: created.version,
      sentenceCount: sentences.length,
      sourceQuestionId: question.id,
    },
    usedChunks,
    englishMarkdown: parsed.englishAnswer,
    vietnameseText: parsed.vietnameseTranslation,
    duplicate: false,
    fallbackUsed,
    warnings,
  };
}
