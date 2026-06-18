import { createHash } from "node:crypto";

import type {
  ChunkOption,
  IeltsQuestionRecord,
  IeltsQuestionPromptOption,
  QuestionChunkRecommendation,
  SpeakingIdeaOption,
} from "@/lib/types";
import type { QuestionChunkMappingsFormValues } from "@/lib/validation";
import { toStringArray } from "@/lib/utils";
import { prisma } from "@/server/prisma";
import { saveQuestionChunkMappings as persistQuestionChunkMappings } from "@/server/question-mappings";

type QuestionEntity = Awaited<ReturnType<typeof getQuestionEntities>>[number];
type QuestionEntityWithOptionalIdeas = Omit<QuestionEntity, "ideaMappings"> & {
  ideaMappings?: QuestionEntity["ideaMappings"];
};

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

async function getQuestionEntities(input?: { onlyApproved?: boolean }) {
  return prisma.ieltsQuestion.findMany({
    where: input?.onlyApproved ? { status: "APPROVED" } : undefined,
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
      ideaMappings: {
        orderBy: [{ isPrimary: "desc" }, { relevanceScore: "desc" }, { createdAt: "asc" }],
        include: {
          idea: {
            select: {
              id: true,
              title: true,
              shortLabel: true,
              status: true,
              reuseScore: true,
              popularityScore: true,
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

function mapSpeakingIdeaOption(idea: {
  id: string;
  title: string;
  shortLabel: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  reuseScore: number;
  popularityScore: number;
}): SpeakingIdeaOption {
  return {
    id: idea.id,
    title: idea.title,
    shortLabel: idea.shortLabel,
    status: idea.status,
    reuseScore: idea.reuseScore,
    popularityScore: idea.popularityScore,
  };
}

export function mapQuestionRecord(question: QuestionEntityWithOptionalIdeas): IeltsQuestionRecord {
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
    ideaRecommendations: (question.ideaMappings ?? []).map((mapping) => ({
      id: mapping.id,
      relevanceScore: mapping.relevanceScore,
      isPrimary: mapping.isPrimary,
      aiReason: mapping.aiReason,
      createdAt: mapping.createdAt.toISOString(),
      updatedAt: mapping.updatedAt.toISOString(),
      idea: mapSpeakingIdeaOption(mapping.idea),
    })),
    status: question.status,
    source: question.source,
    aiReason: question.aiReason,
    popularityScore: question.popularityScore,
    predictedUsefulnessScore: question.predictedUsefulnessScore,
    generatedBatchId: question.generatedBatchId,
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString(),
  };
}

export async function getQuestionBank() {
  const questions = await getQuestionEntities({ onlyApproved: true });
  return questions.map(mapQuestionRecord);
}

export async function getAdminQuestionBank() {
  const questions = await getQuestionEntities();
  return questions.map(mapQuestionRecord);
}

export function normalizeQuestionPrompt(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .slice(0, 191);
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
    where: { status: "APPROVED" },
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
  const [questions, chunks, ideas] = await Promise.all([
    getAdminQuestionBank(),
    getChunkOptionsForQuestionMappings(),
    prisma.speakingIdea.findMany({
      where: {
        status: {
          in: ["ACTIVE", "DRAFT"],
        },
      },
      orderBy: [{ reuseScore: "desc" }, { popularityScore: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        shortLabel: true,
        status: true,
        reuseScore: true,
        popularityScore: true,
      },
    }),
  ]);

  return {
    questions,
    chunks,
    ideas: ideas.map(mapSpeakingIdeaOption),
  };
}

export async function saveQuestionChunkMappings(
  values: QuestionChunkMappingsFormValues,
) {
  return persistQuestionChunkMappings(values);
}
