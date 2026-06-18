import type { Prisma } from "@prisma/client";

import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  IeltsQuestionStatus,
  SpeakingIdeaCoverageSnapshot,
  SpeakingIdeaGenerationSummary,
  SpeakingIdeaQuestionOption,
  SpeakingIdeaRecord,
} from "@/lib/types";
import type { SpeakingIdeaFormValues } from "@/lib/validation";
import { normalizeText } from "@/lib/utils";
import { prisma } from "@/server/prisma";

const speakingIdeaInclude = {
  variants: {
    orderBy: [{ bandLevel: "asc" }, { createdAt: "asc" }],
  },
  supports: {
    orderBy: [{ createdAt: "asc" }],
  },
  patterns: {
    orderBy: [{ createdAt: "asc" }],
  },
  questionMaps: {
    orderBy: [{ isPrimary: "desc" }, { relevanceScore: "desc" }, { createdAt: "asc" }],
    include: {
      speakingQuestion: {
        select: {
          id: true,
          taskType: true,
          topic: true,
          subTopic: true,
          prompt: true,
          targetBand: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.SpeakingIdeaInclude;

type SpeakingIdeaEntity = Prisma.SpeakingIdeaGetPayload<{
  include: typeof speakingIdeaInclude;
}>;

function mapQuestionOption(question: {
  id: string;
  taskType: "PART_1" | "PART_2" | "PART_3";
  topic: string;
  subTopic: string | null;
  prompt: string;
  targetBand: number;
  status: IeltsQuestionStatus;
}): SpeakingIdeaQuestionOption {
  return {
    id: question.id,
    taskType: question.taskType,
    topic: question.topic,
    subTopic: question.subTopic,
    prompt: question.prompt,
    targetBand: question.targetBand,
    status: question.status,
  };
}

function mapSpeakingIdeaRecord(idea: SpeakingIdeaEntity): SpeakingIdeaRecord {
  return {
    id: idea.id,
    title: idea.title,
    shortLabel: idea.shortLabel,
    descriptionVi: idea.descriptionVi,
    descriptionEn: idea.descriptionEn,
    popularityScore: idea.popularityScore,
    reuseScore: idea.reuseScore,
    status: idea.status,
    aiReason: idea.aiReason,
    generatedBatchId: idea.generatedBatchId,
    createdAt: idea.createdAt.toISOString(),
    updatedAt: idea.updatedAt.toISOString(),
    variants: idea.variants.map((variant: SpeakingIdeaEntity["variants"][number]) => ({
      id: variant.id,
      bandLevel: variant.bandLevel,
      phrase: variant.phrase,
      exampleSentence: variant.exampleSentence,
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString(),
    })),
    supports: idea.supports.map((support: SpeakingIdeaEntity["supports"][number]) => ({
      id: support.id,
      supportType: support.supportType,
      text: support.text,
      example: support.example,
      createdAt: support.createdAt.toISOString(),
      updatedAt: support.updatedAt.toISOString(),
    })),
    patterns: idea.patterns.map((pattern: SpeakingIdeaEntity["patterns"][number]) => ({
      id: pattern.id,
      patternText: pattern.patternText,
      variablesJson: pattern.variablesJson,
      exampleAnswer: pattern.exampleAnswer,
      createdAt: pattern.createdAt.toISOString(),
      updatedAt: pattern.updatedAt.toISOString(),
    })),
    questionMaps: idea.questionMaps.map((questionMap: SpeakingIdeaEntity["questionMaps"][number]) => ({
      id: questionMap.id,
      relevanceScore: questionMap.relevanceScore,
      isPrimary: questionMap.isPrimary,
      aiReason: questionMap.aiReason,
      createdAt: questionMap.createdAt.toISOString(),
      updatedAt: questionMap.updatedAt.toISOString(),
      speakingQuestion: mapQuestionOption(questionMap.speakingQuestion),
    })),
  };
}

async function getSpeakingIdeaEntities(input?: { ideaId?: string }) {
  return prisma.speakingIdea.findMany({
    where: input?.ideaId ? { id: input.ideaId } : undefined,
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    include: speakingIdeaInclude,
  });
}

export async function listSpeakingIdeas() {
  const ideas = await getSpeakingIdeaEntities();
  return ideas.map(mapSpeakingIdeaRecord);
}

export function normalizeSpeakingIdeaIdentity(value: string) {
  return normalizeText(value).slice(0, 191);
}

export async function getSpeakingIdeaIdentitySnapshot() {
  const ideas = await prisma.speakingIdea.findMany({
    select: {
      id: true,
      title: true,
      shortLabel: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return {
    titles: ideas.map((idea) => idea.title),
    shortLabels: ideas.map((idea) => idea.shortLabel),
    normalizedTitles: new Set(ideas.map((idea) => normalizeSpeakingIdeaIdentity(idea.title))),
    normalizedShortLabels: new Set(
      ideas.map((idea) => normalizeSpeakingIdeaIdentity(idea.shortLabel)),
    ),
  };
}

export async function getSpeakingIdeaById(ideaId: string) {
  const [idea] = await getSpeakingIdeaEntities({ ideaId });
  return idea ? mapSpeakingIdeaRecord(idea) : null;
}

function toCoveragePercent(mappedCount: number, questionCount: number) {
  if (questionCount === 0) {
    return 0;
  }

  return Math.round((mappedCount / questionCount) * 100);
}

export async function getSpeakingIdeaCoverageSnapshot(): Promise<SpeakingIdeaCoverageSnapshot> {
  const [activeIdeas, approvedQuestions] = await Promise.all([
    prisma.speakingIdea.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: [{ reuseScore: "desc" }, { popularityScore: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        shortLabel: true,
        reuseScore: true,
        popularityScore: true,
        questionMaps: {
          select: {
            speakingQuestionId: true,
          },
        },
      },
    }),
    prisma.ieltsQuestion.findMany({
      where: {
        status: "APPROVED",
      },
      orderBy: [{ taskType: "asc" }, { topic: "asc" }, { prompt: "asc" }],
      select: {
        id: true,
        taskType: true,
        topic: true,
        subTopic: true,
        prompt: true,
        targetBand: true,
        ideaMappings: {
          where: {
            idea: {
              status: "ACTIVE",
            },
          },
          select: {
            ideaId: true,
          },
        },
      },
    }),
  ]);

  const mappedQuestionIds = new Set(
    approvedQuestions
      .filter((question) => question.ideaMappings.length > 0)
      .map((question) => question.id),
  );

  const unmappedQuestions = approvedQuestions
    .filter((question) => question.ideaMappings.length === 0)
    .map((question) => ({
      id: question.id,
      taskType: question.taskType,
      topic: question.topic,
      subTopic: question.subTopic,
      prompt: question.prompt,
      targetBand: question.targetBand,
    }));

  const topicAccumulator = new Map<
    string,
    {
      questionCount: number;
      mappedCount: number;
    }
  >();

  for (const question of approvedQuestions) {
    const current = topicAccumulator.get(question.topic) ?? {
      questionCount: 0,
      mappedCount: 0,
    };

    current.questionCount += 1;
    if (question.ideaMappings.length > 0) {
      current.mappedCount += 1;
    }

    topicAccumulator.set(question.topic, current);
  }

  const weakTopics = [...topicAccumulator.entries()]
    .map(([topic, data]) => ({
      topic,
      questionCount: data.questionCount,
      mappedCount: data.mappedCount,
      coveragePercent: toCoveragePercent(data.mappedCount, data.questionCount),
    }))
    .sort((left, right) => {
      if (left.coveragePercent !== right.coveragePercent) {
        return left.coveragePercent - right.coveragePercent;
      }
      return right.questionCount - left.questionCount;
    });

  const coverageByPart = (["PART_1", "PART_2", "PART_3"] as const).map((taskType) => {
    const questions = approvedQuestions.filter((question) => question.taskType === taskType);
    const mappedCount = questions.filter((question) => question.ideaMappings.length > 0).length;
    const questionCount = questions.length;

    return {
      taskType,
      questionCount,
      mappedCount,
      unmappedCount: questionCount - mappedCount,
      coveragePercent: toCoveragePercent(mappedCount, questionCount),
    };
  });

  const topIdeas = activeIdeas
    .map((idea) => ({
      id: idea.id,
      title: idea.title,
      shortLabel: idea.shortLabel,
      reuseScore: idea.reuseScore,
      popularityScore: idea.popularityScore,
      linkedQuestionsCount: idea.questionMaps.length,
      generatedAnswersCount: 0,
    }))
    .sort((left, right) => {
      if (right.linkedQuestionsCount !== left.linkedQuestionsCount) {
        return right.linkedQuestionsCount - left.linkedQuestionsCount;
      }
      if (right.reuseScore !== left.reuseScore) {
        return right.reuseScore - left.reuseScore;
      }
      return right.popularityScore - left.popularityScore;
    });

  return {
    totalActiveIdeas: activeIdeas.length,
    totalMappedQuestions: mappedQuestionIds.size,
    questionsWithoutIdeas: unmappedQuestions.length,
    ideasWithNoLinkedQuestions: activeIdeas.filter((idea) => idea.questionMaps.length === 0).length,
    topIdeas,
    unmappedQuestions,
    weakTopics,
    coverageByPart,
  };
}

export async function getSpeakingIdeaQuestionOptions() {
  const questions = await prisma.ieltsQuestion.findMany({
    orderBy: [{ taskType: "asc" }, { topic: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      taskType: true,
      topic: true,
      subTopic: true,
      prompt: true,
      targetBand: true,
      status: true,
    },
  });

  return questions.map(mapQuestionOption);
}

export async function getSpeakingIdeaOptions() {
  const ideas = await prisma.speakingIdea.findMany({
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
  });

  return ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    shortLabel: idea.shortLabel,
    status: idea.status,
    reuseScore: idea.reuseScore,
    popularityScore: idea.popularityScore,
  }));
}

async function assertSpeakingQuestionsExist(questionIds: string[]) {
  if (questionIds.length === 0) {
    return;
  }

  const questions = await prisma.ieltsQuestion.findMany({
    where: {
      id: {
        in: questionIds,
      },
    },
    select: {
      id: true,
    },
  });

  if (questions.length !== questionIds.length) {
    throw new ValidationError("One or more linked speaking questions were not found.");
  }
}

export async function saveSpeakingIdea(values: SpeakingIdeaFormValues) {
  await assertSpeakingQuestionsExist(
    [...new Set(values.questionMaps.map((questionMap) => questionMap.speakingQuestionId))],
  );

  if (values.id) {
    const existing = await prisma.speakingIdea.findUnique({
      where: {
        id: values.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("Speaking idea was not found.");
    }
  }

  const saved = await prisma.$transaction(async (tx) => {
    const idea = values.id
      ? await tx.speakingIdea.update({
          where: { id: values.id },
          data: {
            title: values.title,
            shortLabel: values.shortLabel,
            descriptionVi: values.descriptionVi,
            descriptionEn: values.descriptionEn,
            popularityScore: values.popularityScore,
            reuseScore: values.reuseScore,
            status: values.status,
          },
        })
      : await tx.speakingIdea.create({
          data: {
            title: values.title,
            shortLabel: values.shortLabel,
            descriptionVi: values.descriptionVi,
            descriptionEn: values.descriptionEn,
            popularityScore: values.popularityScore,
            reuseScore: values.reuseScore,
            status: values.status,
          },
        });

    await Promise.all([
      tx.speakingIdeaVariant.deleteMany({ where: { ideaId: idea.id } }),
      tx.speakingIdeaSupport.deleteMany({ where: { ideaId: idea.id } }),
      tx.speakingIdeaPattern.deleteMany({ where: { ideaId: idea.id } }),
      tx.speakingIdeaQuestionMap.deleteMany({ where: { ideaId: idea.id } }),
    ]);

    const primaryQuestionIds = values.questionMaps
      .filter((questionMap) => questionMap.isPrimary)
      .map((questionMap) => questionMap.speakingQuestionId);

    if (primaryQuestionIds.length > 0) {
      await tx.speakingIdeaQuestionMap.updateMany({
        where: {
          speakingQuestionId: {
            in: primaryQuestionIds,
          },
          ideaId: {
            not: idea.id,
          },
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    if (values.variants.length > 0) {
      await tx.speakingIdeaVariant.createMany({
        data: values.variants.map((variant) => ({
          ideaId: idea.id,
          bandLevel: variant.bandLevel,
          phrase: variant.phrase,
          exampleSentence: variant.exampleSentence,
        })),
      });
    }

    if (values.supports.length > 0) {
      await tx.speakingIdeaSupport.createMany({
        data: values.supports.map((support) => ({
          ideaId: idea.id,
          supportType: support.supportType,
          text: support.text,
          example: support.example,
        })),
      });
    }

    if (values.patterns.length > 0) {
      await tx.speakingIdeaPattern.createMany({
        data: values.patterns.map((pattern) => ({
          ideaId: idea.id,
          patternText: pattern.patternText,
          variablesJson: pattern.variablesJson,
          exampleAnswer: pattern.exampleAnswer,
        })),
      });
    }

    if (values.questionMaps.length > 0) {
      await tx.speakingIdeaQuestionMap.createMany({
        data: values.questionMaps.map((questionMap) => ({
          ideaId: idea.id,
          speakingQuestionId: questionMap.speakingQuestionId,
          relevanceScore: questionMap.relevanceScore,
          isPrimary: questionMap.isPrimary,
          aiReason: questionMap.aiReason,
        })),
      });
    }

    const [reloaded] = await tx.speakingIdea.findMany({
      where: {
        id: idea.id,
      },
      include: speakingIdeaInclude,
    });

    if (!reloaded) {
      throw new NotFoundError("Speaking idea was not found after saving.");
    }

    return reloaded;
  });

  return mapSpeakingIdeaRecord(saved);
}

export async function setSpeakingIdeaStatus(input: {
  ideaId: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
}) {
  const existing = await prisma.speakingIdea.findUnique({
    where: { id: input.ideaId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Speaking idea was not found.");
  }

  const updated = await prisma.speakingIdea.update({
    where: {
      id: input.ideaId,
    },
    data: {
      status: input.status,
    },
  });

  return {
    id: updated.id,
    status: updated.status,
  };
}

export async function createGeneratedSpeakingIdeas(input: {
  batchId: string;
  ideas: Array<{
    title: string;
    shortLabel: string;
    descriptionVi: string;
    descriptionEn: string;
    popularityScore: number;
    reuseScore: number;
    aiReason: string | null;
    variants: Array<{
      bandLevel: number;
      phrase: string;
      exampleSentence: string;
    }>;
    supports: Array<{
      supportType: "REASON" | "EXAMPLE" | "RESULT" | "CONTRAST" | "DETAIL" | "PERSONAL_EXPERIENCE";
      text: string;
      example: string | null;
    }>;
    patterns: Array<{
      patternText: string;
      variablesJson: unknown | null;
      exampleAnswer: string;
    }>;
  }>;
}): Promise<SpeakingIdeaGenerationSummary["ideas"]> {
  const created: SpeakingIdeaRecord[] = [];

  for (const candidate of input.ideas) {
    const [saved] = await prisma.$transaction(async (tx) => {
      const idea = await tx.speakingIdea.create({
        data: {
          title: candidate.title,
          shortLabel: candidate.shortLabel,
          descriptionVi: candidate.descriptionVi,
          descriptionEn: candidate.descriptionEn,
          popularityScore: candidate.popularityScore,
          reuseScore: candidate.reuseScore,
          status: "DRAFT",
          aiReason: candidate.aiReason,
          generatedBatchId: input.batchId,
        },
      });

      if (candidate.variants.length > 0) {
        await tx.speakingIdeaVariant.createMany({
          data: candidate.variants.map((variant) => ({
            ideaId: idea.id,
            bandLevel: variant.bandLevel,
            phrase: variant.phrase,
            exampleSentence: variant.exampleSentence,
          })),
        });
      }

      if (candidate.supports.length > 0) {
        await tx.speakingIdeaSupport.createMany({
          data: candidate.supports.map((support) => ({
            ideaId: idea.id,
            supportType: support.supportType,
            text: support.text,
            example: support.example,
          })),
        });
      }

      if (candidate.patterns.length > 0) {
        await tx.speakingIdeaPattern.createMany({
          data: candidate.patterns.map((pattern) => ({
            ideaId: idea.id,
            patternText: pattern.patternText,
            variablesJson:
              (pattern.variablesJson as
                | Prisma.InputJsonValue
                | Prisma.NullableJsonNullValueInput
                | undefined) ?? undefined,
            exampleAnswer: pattern.exampleAnswer,
          })),
        });
      }

      return tx.speakingIdea.findMany({
        where: {
          id: idea.id,
        },
        include: speakingIdeaInclude,
      });
    });

    if (saved) {
      created.push(mapSpeakingIdeaRecord(saved));
    }
  }

  return created;
}
