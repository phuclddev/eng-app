import type {
  AiSampleAnswerUsedChunk,
  GeneratedAnswerLength,
  IeltsTaskType,
  QuestionChunkUsageRole,
  SpeakingIdeaGeneratedAnswerResponse,
  SpeakingIdeaSupportType,
} from "@/lib/types";
import type { SpeakingIdeaGenerateAnswerPayload } from "@/lib/validation";
import { AppError, NotFoundError } from "@/lib/errors";
import { normalizeAiTextForDisplay } from "@/lib/text-cleanup";
import { toStringArray } from "@/lib/utils";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildIeltsSpeakingIdeaAnswerPrompt } from "@/server/ai/prompts/ielts-speaking-idea-answer";
import {
  extractUsedChunksFromSampleAnswer,
} from "@/server/ai/sample-answer-service";
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

function toUsedChunkRecord(
  chunk: Parameters<typeof extractUsedChunksFromSampleAnswer>[0]["selectedChunks"][number],
): AiSampleAnswerUsedChunk {
  return {
    id: chunk.id,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    topic: chunk.topic,
    bandLevel: chunk.bandLevel,
    usageRole: chunk.usageRole,
  };
}

function normalizeGeneratedAnswerMarkdown(input: {
  answer: string;
  ideaTitle: string;
}) {
  const cleaned = normalizeAiTextForDisplay(input.answer).trim();

  if (!cleaned) {
    throw new AppError(
      "AI Tutor returned an empty idea-based answer.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const hasRequiredHeadings =
    /^#{1,6}\s*sample answer\b/im.test(cleaned) &&
    /^#{1,6}\s*idea used\b/im.test(cleaned) &&
    /^#{1,6}\s*chunks\s*\/\s*phrases used\b/im.test(cleaned) &&
    /^#{1,6}\s*vietnamese explanation\b/im.test(cleaned) &&
    /^#{1,6}\s*reusable pattern\b/im.test(cleaned);

  if (hasRequiredHeadings) {
    return cleaned;
  }

  return [
    "# Sample Answer",
    cleaned,
    "",
    "# Idea Used",
    `Core reusable idea: **${input.ideaTitle}**.`,
    "",
    "# Chunks / Phrases Used",
    "- Review the bold phrases in the answer above.",
    "",
    "# Vietnamese Explanation",
    "AI did not return the full structured explanation, so the answer above is shown in fallback mode.",
    "",
    "# Reusable Pattern",
    "Adapt the same core idea to similar IELTS Speaking questions by changing the reason or example.",
  ].join("\n");
}

async function getQuestionWithContext(questionId: string) {
  return prisma.ieltsQuestion.findUnique({
    where: { id: questionId },
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

async function getQuestionMapReason(ideaId: string, questionId: string) {
  const mapping = await prisma.speakingIdeaQuestionMap.findUnique({
    where: {
      ideaId_speakingQuestionId: {
        ideaId,
        speakingQuestionId: questionId,
      },
    },
    select: {
      aiReason: true,
      relevanceScore: true,
      isPrimary: true,
    },
  });

  return mapping;
}

async function getTopicChunks(options: {
  excludeChunkIds: string[];
  maxChunks: number;
  subTopic?: null | string;
  topic: string;
}) {
  const topicNames = [options.topic, options.subTopic].filter(Boolean) as string[];

  if (topicNames.length === 0) {
    return [];
  }

  return prisma.chunk.findMany({
    where: {
      deletedAt: null,
      id: {
        notIn: options.excludeChunkIds,
      },
      topic: {
        name: {
          in: topicNames,
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

function buildLengthMaxChunks(length: GeneratedAnswerLength) {
  switch (length) {
    case "SHORT":
      return 16;
    case "MEDIUM":
      return 24;
    case "LONG":
      return 32;
  }
}

function mapGeneratedAnswerRecord(record: {
  questionId: string;
  ideaId: string;
  targetBand: number;
  length: GeneratedAnswerLength;
  answerMarkdown: string;
}) {
  return {
    questionId: record.questionId,
    ideaId: record.ideaId,
    targetBand: record.targetBand,
    length: record.length,
    answerMarkdown: record.answerMarkdown,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateSpeakingIdeaAnswer(input: {
  payload: SpeakingIdeaGenerateAnswerPayload;
}): Promise<SpeakingIdeaGeneratedAnswerResponse> {
  const [question, idea, questionMap] = await Promise.all([
    getQuestionWithContext(input.payload.questionId),
    prisma.speakingIdea.findUnique({
      where: { id: input.payload.ideaId },
      include: {
        variants: {
          orderBy: [{ bandLevel: "asc" }, { createdAt: "asc" }],
        },
        supports: {
          orderBy: [{ createdAt: "asc" }],
        },
        patterns: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    }),
    getQuestionMapReason(input.payload.ideaId, input.payload.questionId),
  ]);

  if (!question) {
    throw new NotFoundError("Question was not found.");
  }

  if (!idea) {
    throw new NotFoundError("Speaking idea was not found.");
  }

  const effectiveTargetBand = input.payload.targetBand ?? question.targetBand;
  const maxChunks = buildLengthMaxChunks(input.payload.length);
  const mappedChunkIds = question.chunkMappings.map((mapping) => mapping.chunkId);
  const recommendedChunks = question.chunkMappings.map((mapping) =>
    mapChunkCandidate(mapping.chunk, "RECOMMENDED", mapping.usageRole, mapping.sortOrder),
  );
  const sameTopicChunks = (await getTopicChunks({
    excludeChunkIds: mappedChunkIds,
    maxChunks,
    topic: question.topic,
    subTopic: question.subTopic,
  })).map((chunk) => mapChunkCandidate(chunk, "TOPIC"));
  const generalChunks = (await getGeneralChunkPool({
    excludeChunkIds: [...mappedChunkIds, ...sameTopicChunks.map((chunk) => chunk.id)],
    maxChunks,
  })).map((chunk) => mapChunkCandidate(chunk, "GENERAL"));

  const selectedChunks = selectSampleAnswerChunks({
    recommendedChunks,
    sameTopicChunks,
    generalChunks,
    maxChunks,
    targetBand: effectiveTargetBand,
    topic: question.topic,
    subTopic: question.subTopic,
  });

  const rawAnswer = (
    await callAiTutor({
      query: buildIeltsSpeakingIdeaAnswerPrompt({
        question: {
          taskType: question.taskType as IeltsTaskType,
          topic: question.topic,
          subTopic: question.subTopic,
          prompt: question.prompt,
          supportingPoints: toStringArray(question.supportingPoints),
        },
        idea: {
          title: idea.title,
          shortLabel: idea.shortLabel,
          descriptionVi: idea.descriptionVi,
          descriptionEn: idea.descriptionEn,
          variants: idea.variants,
          supports: idea.supports as Array<{
            supportType: SpeakingIdeaSupportType;
            text: string;
            example: string | null;
          }>,
          patterns: idea.patterns,
          mappingReason: questionMap?.aiReason ?? null,
        },
        targetBand: effectiveTargetBand,
        length: input.payload.length,
        recommendedChunks: selectedChunks.map((chunk) => ({
          chunk: chunk.chunk,
          meaningVi: chunk.meaningVi,
          usageRole: chunk.usageRole,
          exampleSentence: null,
          bandLevel: chunk.bandLevel,
          example: chunk.example,
          source: chunk.source,
          topic: chunk.topic,
        })),
      }),
    })
  ).answer;

  const answerMarkdown = normalizeGeneratedAnswerMarkdown({
    answer: rawAnswer,
    ideaTitle: idea.title,
  });

  const usedChunks = extractUsedChunksFromSampleAnswer({
    answer: rawAnswer,
    selectedChunks,
  }).map(toUsedChunkRecord);

  return {
    answer: mapGeneratedAnswerRecord({
      questionId: question.id,
      ideaId: idea.id,
      targetBand: effectiveTargetBand,
      length: input.payload.length,
      answerMarkdown,
    }),
    selectedChunkCount: selectedChunks.length,
    usedChunks,
  };
}
