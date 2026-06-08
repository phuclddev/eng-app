import { AppError, NotFoundError } from "@/lib/errors";
import type {
  AiSampleAnswerResponse,
  AiTutorRecommendedChunkContext,
  IeltsTaskType,
  QuestionChunkUsageRole,
} from "@/lib/types";
import { slugify, toStringArray } from "@/lib/utils";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildSampleAnswerPrompt } from "@/server/ai/prompts/sample-answer";
import {
  type SampleAnswerChunkCandidate,
  selectSampleAnswerChunks,
} from "@/server/ai/sample-answer-selection";
import { prisma } from "@/server/prisma";

type ChunkWithTopic = {
  id: string;
  chunk: string;
  meaningVi: string;
  bandLevel: number;
  example: string;
  topic: {
    name: string;
  } | null;
};

function normalizeText(value?: null | string) {
  return value?.trim().toLowerCase().normalize("NFKC") ?? "";
}

function extractBoldSegments(markdown: string) {
  const matches = markdown.matchAll(/\*\*([^*\n][^*\n]*?)\*\*/g);

  return [...matches]
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

function toRecommendedChunkContext(chunk: SampleAnswerChunkCandidate): AiTutorRecommendedChunkContext & {
  bandLevel: number;
  example?: string | null;
  source: "GENERAL" | "RECOMMENDED" | "TOPIC";
  topic?: string | null;
} {
  return {
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    usageRole: chunk.usageRole,
    exampleSentence: null,
    bandLevel: chunk.bandLevel,
    example: chunk.example,
    source: chunk.source,
    topic: chunk.topic,
  };
}

function mapChunkCandidate(
  chunk: ChunkWithTopic,
  source: "GENERAL" | "RECOMMENDED" | "TOPIC",
  usageRole?: null | QuestionChunkUsageRole,
  sortOrder?: number,
): SampleAnswerChunkCandidate {
  return {
    id: chunk.id,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    topic: chunk.topic?.name ?? null,
    bandLevel: chunk.bandLevel,
    usageRole: usageRole ?? null,
    example: chunk.example,
    source,
    sortOrder,
  };
}

async function getQuestionWithMappings(speakingPromptId: string) {
  return prisma.ieltsQuestion.findUnique({
    where: {
      id: speakingPromptId,
    },
    include: {
      chunkMappings: {
        where: {
          chunk: {
            deletedAt: null,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          chunk: {
            include: {
              topic: true,
            },
          },
        },
      },
    },
  });
}

async function getTopicChunks(options: {
  excludeChunkIds: string[];
  maxChunks: number;
  subTopic?: null | string;
  topic: string;
}) {
  const topicSlugs = [options.topic, options.subTopic]
    .map((value) => value?.trim())
    .filter(Boolean)
    .map((value) => slugify(value!));

  if (topicSlugs.length === 0) {
    return [];
  }

  return prisma.chunk.findMany({
    where: {
      deletedAt: null,
      id: {
        notIn: options.excludeChunkIds,
      },
      topic: {
        slug: {
          in: topicSlugs,
        },
      },
    },
    include: {
      topic: true,
    },
    orderBy: [{ updatedAt: "desc" }, { chunk: "asc" }],
    take: Math.min(Math.max(options.maxChunks * 2, 24), 120),
  });
}

async function getGeneralChunkPool(options: {
  excludeChunkIds: string[];
  maxChunks: number;
}) {
  return prisma.chunk.findMany({
    where: {
      deletedAt: null,
      id: {
        notIn: options.excludeChunkIds,
      },
    },
    include: {
      topic: true,
    },
    orderBy: [{ updatedAt: "desc" }, { chunk: "asc" }],
    take: Math.min(Math.max(options.maxChunks * 4, 60), 200),
  });
}

export function extractUsedChunksFromSampleAnswer(options: {
  answer: string;
  selectedChunks: Array<{
    bandLevel: number;
    chunk: string;
    id: string;
    meaningVi: string;
    topic: string | null;
    usageRole: QuestionChunkUsageRole | null;
  }>;
}) {
  const boldSegments = extractBoldSegments(options.answer).map(normalizeText);

  if (boldSegments.length === 0) {
    return [];
  }

  const matched = new Set<string>();

  return options.selectedChunks.filter((chunk) => {
    const normalizedChunk = normalizeText(chunk.chunk);
    const isMatch = boldSegments.some(
      (segment) => segment === normalizedChunk || segment.includes(normalizedChunk),
    );

    if (!isMatch || matched.has(chunk.id)) {
      return false;
    }

    matched.add(chunk.id);
    return true;
  });
}

function ensureNonEmptyAnswer(answer: string) {
  const trimmed = answer.trim();

  if (!trimmed) {
    throw new AppError(
      "AI Tutor returned an empty sample answer.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  return trimmed;
}

export async function generateQuestionSampleAnswer(input: {
  maxChunks: number;
  speakingPromptId: string;
  targetBand?: number;
}): Promise<AiSampleAnswerResponse> {
  const question = await getQuestionWithMappings(input.speakingPromptId);

  if (!question) {
    throw new NotFoundError("Speaking prompt was not found.");
  }

  const effectiveTargetBand = input.targetBand ?? question.targetBand;
  const mappedChunkIds = question.chunkMappings.map((mapping) => mapping.chunkId);
  const recommendedChunks = question.chunkMappings.map((mapping) =>
    mapChunkCandidate(
      mapping.chunk,
      "RECOMMENDED",
      mapping.usageRole,
      mapping.sortOrder,
    ),
  );
  const sameTopicChunks = (await getTopicChunks({
    excludeChunkIds: mappedChunkIds,
    maxChunks: input.maxChunks,
    topic: question.topic,
    subTopic: question.subTopic,
  })).map((chunk) => mapChunkCandidate(chunk, "TOPIC"));
  const generalChunks = (await getGeneralChunkPool({
    excludeChunkIds: [...mappedChunkIds, ...sameTopicChunks.map((chunk) => chunk.id)],
    maxChunks: input.maxChunks,
  })).map((chunk) => mapChunkCandidate(chunk, "GENERAL"));

  const selectedChunks = selectSampleAnswerChunks({
    recommendedChunks,
    sameTopicChunks,
    generalChunks,
    maxChunks: input.maxChunks,
    targetBand: effectiveTargetBand,
    topic: question.topic,
    subTopic: question.subTopic,
  });

  const answer = ensureNonEmptyAnswer(
    (
      await callAiTutor({
        query: buildSampleAnswerPrompt({
          taskType: question.taskType as IeltsTaskType,
          topic: question.topic,
          subTopic: question.subTopic,
          prompt: question.prompt,
          supportingPoints: toStringArray(question.supportingPoints),
          targetBand: effectiveTargetBand,
          recommendedChunks: selectedChunks.map(toRecommendedChunkContext),
        }),
      })
    ).answer,
  );

  const usedChunks = extractUsedChunksFromSampleAnswer({
    answer,
    selectedChunks,
  });

  return {
    answer,
    speakingPromptId: question.id,
    selectedChunkCount: selectedChunks.length,
    targetBand: effectiveTargetBand,
    usedChunks,
  };
}
