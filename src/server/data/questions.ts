import { createHash } from "node:crypto";

import type {
  ChunkOption,
  IeltsQuestionRecord,
  IeltsQuestionPromptOption,
  QuestionChunkRecommendation,
} from "@/lib/types";
import type { QuestionChunkMappingsFormValues } from "@/lib/validation";
import { toStringArray } from "@/lib/utils";
import { prisma } from "@/server/prisma";
import { saveQuestionChunkMappings as persistQuestionChunkMappings } from "@/server/question-mappings";

type QuestionEntity = Awaited<ReturnType<typeof getQuestionEntities>>[number];

function normalizeFingerprintPart(value?: null | string) {
  return value?.trim().toLowerCase().normalize("NFKC") ?? "";
}

export function buildQuestionFingerprint(input: {
  prompt: string;
  skill: string;
  subTopic?: null | string;
  taskType: string;
  topic: string;
}) {
  const key = [
    normalizeFingerprintPart(input.skill),
    normalizeFingerprintPart(input.taskType),
    normalizeFingerprintPart(input.topic),
    normalizeFingerprintPart(input.subTopic),
    normalizeFingerprintPart(input.prompt),
  ].join("::");

  return createHash("sha1").update(key).digest("hex");
}

async function getQuestionEntities() {
  return prisma.ieltsQuestion.findMany({
    orderBy: [
      { taskType: "asc" },
      { topic: "asc" },
      { updatedAt: "desc" },
    ],
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

function mapQuestionChunkRecommendation(
  mapping: QuestionEntity["chunkMappings"][number],
): QuestionChunkRecommendation {
  return {
    id: mapping.id,
    usageRole: mapping.usageRole,
    exampleSentence: mapping.exampleSentence,
    sortOrder: mapping.sortOrder,
    chunk: {
      id: mapping.chunk.id,
      chunk: mapping.chunk.chunk,
      meaningVi: mapping.chunk.meaningVi,
      topic: mapping.chunk.topic?.name ?? null,
      example: mapping.chunk.example,
    },
  };
}

export function mapQuestionRecord(question: QuestionEntity): IeltsQuestionRecord {
  return {
    id: question.id,
    skill: question.skill,
    taskType: question.taskType,
    topic: question.topic,
    subTopic: question.subTopic,
    prompt: question.prompt,
    supportingPoints: toStringArray(question.supportingPoints),
    difficulty: question.difficulty,
    targetBand: question.targetBand,
    notes: question.notes,
    mappingCount: question.chunkMappings.length,
    recommendations: question.chunkMappings.map(mapQuestionChunkRecommendation),
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}

export async function getQuestionBank() {
  const questions = await getQuestionEntities();
  return questions.map(mapQuestionRecord);
}

export async function getChunkOptionsForQuestionMappings(): Promise<ChunkOption[]> {
  const chunks = await prisma.chunk.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        chunk: "asc",
      },
    ],
    include: {
      topic: true,
    },
  });

  return chunks.map((chunk) => ({
    id: chunk.id,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    topic: chunk.topic?.name ?? null,
  }));
}

export async function getQuestionPromptOptions(): Promise<IeltsQuestionPromptOption[]> {
  const questions = await prisma.ieltsQuestion.findMany({
    orderBy: [
      { taskType: "asc" },
      { topic: "asc" },
      { prompt: "asc" },
    ],
    select: {
      id: true,
      taskType: true,
      topic: true,
      subTopic: true,
      prompt: true,
      targetBand: true,
    },
  });

  return questions.map((question) => ({
    id: question.id,
    taskType: question.taskType,
    topic: question.topic,
    subTopic: question.subTopic,
    prompt: question.prompt,
    targetBand: question.targetBand,
  }));
}

export async function getAdminQuestionBankSnapshot() {
  const [questions, chunks] = await Promise.all([
    getQuestionBank(),
    getChunkOptionsForQuestionMappings(),
  ]);

  return {
    questions,
    chunks,
  };
}

export async function saveQuestionChunkMappings(
  values: QuestionChunkMappingsFormValues,
) {
  return persistQuestionChunkMappings(values);
}
