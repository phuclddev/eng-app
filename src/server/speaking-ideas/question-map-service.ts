import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  IdeaQuestionMappingSuggestPayload,
  IdeaQuestionMapCreatePayload,
  IdeaQuestionMapUpdatePayload,
} from "@/lib/validation";
import type { IdeaQuestionMappingSuggestion } from "@/lib/types";
import { clamp } from "@/lib/utils";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import {
  buildIdeaToQuestionsPrompt,
  buildQuestionToIdeasPrompt,
} from "@/server/ai/prompts/ielts-speaking-idea-question-mapping";
import { prisma } from "@/server/prisma";

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

export function parseSuggestionAnswer(answer: string, idKey: "ideaId" | "questionId") {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJsonCandidate(answer));
  } catch {
    throw new AppError(
      "AI returned an invalid idea-question mapping response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { suggestions?: unknown }).suggestions)
      ? (raw as { suggestions: unknown[] }).suggestions
      : Array.isArray(raw)
        ? raw
        : null;

  if (!list) {
    throw new AppError(
      "AI returned no idea-question suggestions.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const parsed: IdeaQuestionMappingSuggestion[] = [];
  let primaryUsed = false;

  for (const candidate of list) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const targetId =
      typeof record[idKey] === "string" ? record[idKey].trim() : "";
    if (!targetId) {
      continue;
    }

    const requestedPrimary = Boolean(record.isPrimary);
    const isPrimary = requestedPrimary && !primaryUsed;
    if (isPrimary) {
      primaryUsed = true;
    }

    parsed.push({
      targetId,
      relevanceScore: clamp(
        Math.round(Number.isFinite(Number(record.relevanceScore)) ? Number(record.relevanceScore) : 3),
        1,
        5,
      ),
      isPrimary,
      aiReason:
        typeof record.aiReason === "string" && record.aiReason.trim().length > 0
          ? record.aiReason.trim().slice(0, 1200)
          : null,
    });
  }

  return parsed;
}

async function assertIdeaAndQuestionExist(ideaId: string, questionId: string) {
  const [idea, question] = await Promise.all([
    prisma.speakingIdea.findUnique({ where: { id: ideaId }, select: { id: true } }),
    prisma.ieltsQuestion.findUnique({ where: { id: questionId }, select: { id: true } }),
  ]);

  if (!idea) {
    throw new NotFoundError("Speaking idea was not found.");
  }

  if (!question) {
    throw new NotFoundError("Question was not found.");
  }
}

export async function createIdeaQuestionMap(values: IdeaQuestionMapCreatePayload) {
  await assertIdeaAndQuestionExist(values.ideaId, values.questionId);

  const existing = await prisma.speakingIdeaQuestionMap.findUnique({
    where: {
      ideaId_speakingQuestionId: {
        ideaId: values.ideaId,
        speakingQuestionId: values.questionId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    throw new ValidationError("This idea is already linked to that question.");
  }

  return prisma.$transaction(async (tx) => {
    if (values.isPrimary) {
      await tx.speakingIdeaQuestionMap.updateMany({
        where: {
          speakingQuestionId: values.questionId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return tx.speakingIdeaQuestionMap.create({
      data: {
        ideaId: values.ideaId,
        speakingQuestionId: values.questionId,
        relevanceScore: values.relevanceScore,
        isPrimary: values.isPrimary,
        aiReason: values.aiReason ?? null,
      },
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
    });
  });
}

export async function updateIdeaQuestionMap(id: string, values: IdeaQuestionMapUpdatePayload) {
  const existing = await prisma.speakingIdeaQuestionMap.findUnique({
    where: { id },
    select: {
      id: true,
      speakingQuestionId: true,
    },
  });

  if (!existing) {
    throw new NotFoundError("Idea-question mapping was not found.");
  }

  return prisma.$transaction(async (tx) => {
    if (values.isPrimary) {
      await tx.speakingIdeaQuestionMap.updateMany({
        where: {
          speakingQuestionId: existing.speakingQuestionId,
          isPrimary: true,
          id: {
            not: id,
          },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    return tx.speakingIdeaQuestionMap.update({
      where: { id },
      data: {
        ...(typeof values.relevanceScore === "number"
          ? { relevanceScore: values.relevanceScore }
          : {}),
        ...(typeof values.isPrimary === "boolean" ? { isPrimary: values.isPrimary } : {}),
        ...(values.aiReason !== undefined ? { aiReason: values.aiReason ?? null } : {}),
      },
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
    });
  });
}

export async function deleteIdeaQuestionMap(id: string) {
  const existing = await prisma.speakingIdeaQuestionMap.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError("Idea-question mapping was not found.");
  }

  await prisma.speakingIdeaQuestionMap.delete({
    where: { id },
  });
}

export async function suggestIdeaQuestionMappings(input: {
  actorId: string;
  payload: IdeaQuestionMappingSuggestPayload;
}) {
  if (input.payload.mode === "QUESTION_TO_IDEAS") {
    const question = await prisma.ieltsQuestion.findUnique({
      where: { id: input.payload.questionId! },
      include: {
        ideaMappings: {
          select: {
            ideaId: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundError("Question was not found.");
    }

    const mappedIdeaIds = new Set(question.ideaMappings.map((mapping) => mapping.ideaId));
    const ideas = await prisma.speakingIdea.findMany({
      where: {
        status: {
          in: ["ACTIVE", "DRAFT"],
        },
      },
      orderBy: [{ reuseScore: "desc" }, { popularityScore: "desc" }, { updatedAt: "desc" }],
      take: 80,
      include: {
        variants: {
          orderBy: [{ bandLevel: "asc" }],
          take: 2,
        },
        supports: {
          orderBy: [{ createdAt: "asc" }],
          take: 2,
        },
      },
    });

    const candidateIdeas = ideas.filter((idea) => !mappedIdeaIds.has(idea.id));

    let answer: string;
    try {
      const result = await callAiTutor({
        query: buildQuestionToIdeasPrompt({
          question: {
            taskType: question.taskType,
            topic: question.topic,
            subTopic: question.subTopic,
            prompt: question.prompt,
            targetBand: question.targetBand,
            supportingPoints: Array.isArray(question.supportingPoints)
              ? question.supportingPoints.filter((value): value is string => typeof value === "string")
              : [],
          },
          ideaLines: candidateIdeas.map(
            (idea) =>
              `[${idea.id}] ${idea.title} (${idea.shortLabel}) | reuse ${idea.reuseScore}/5 | pop ${idea.popularityScore}/5 | ${idea.descriptionEn.slice(0, 160)}`,
          ),
          limit: input.payload.limit ?? 8,
        }),
      });
      answer = result.answer;
    } catch (error) {
      logger.warn(
        {
          actorId: input.actorId,
          questionId: input.payload.questionId,
          mode: input.payload.mode,
          error: error instanceof Error ? error.message : "unknown",
        },
        "Speaking idea mapping suggestion AI call failed",
      );
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        "Idea mapping suggestions are not available right now.",
        503,
        "AI_TUTOR_UNAVAILABLE",
      );
    }

    const parsed = parseSuggestionAnswer(answer, "ideaId");
    const allowedIds = new Set(candidateIdeas.map((idea) => idea.id));
    return parsed
      .filter((item) => allowedIds.has(item.targetId))
      .slice(0, input.payload.limit ?? 8);
  }

  const idea = await prisma.speakingIdea.findUnique({
    where: { id: input.payload.ideaId! },
    include: {
      questionMaps: {
        select: {
          speakingQuestionId: true,
        },
      },
      variants: {
        orderBy: [{ bandLevel: "asc" }],
        take: 3,
      },
      supports: {
        orderBy: [{ createdAt: "asc" }],
        take: 4,
      },
    },
  });

  if (!idea) {
    throw new NotFoundError("Speaking idea was not found.");
  }

  const mappedQuestionIds = new Set(idea.questionMaps.map((mapping) => mapping.speakingQuestionId));
  const questions = await prisma.ieltsQuestion.findMany({
    where: {
      status: {
        in: ["APPROVED", "SUGGESTED"],
      },
    },
    orderBy: [{ taskType: "asc" }, { topic: "asc" }, { updatedAt: "desc" }],
    take: 80,
    select: {
      id: true,
      taskType: true,
      topic: true,
      subTopic: true,
      prompt: true,
      targetBand: true,
    },
  });

  const candidateQuestions = questions.filter((question) => !mappedQuestionIds.has(question.id));

  let answer: string;
  try {
    const result = await callAiTutor({
      query: buildIdeaToQuestionsPrompt({
        idea: {
          id: idea.id,
          title: idea.title,
          shortLabel: idea.shortLabel,
          status: idea.status,
          reuseScore: idea.reuseScore,
          popularityScore: idea.popularityScore,
          descriptionVi: idea.descriptionVi,
          descriptionEn: idea.descriptionEn,
          variants: idea.variants.map((variant) => variant.phrase),
          supports: idea.supports.map((support) => support.text),
        },
        questionLines: candidateQuestions.map(
          (question) =>
            `[${question.id}] ${question.taskType} | ${question.topic}${question.subTopic ? ` | ${question.subTopic}` : ""} | ${question.prompt.slice(0, 180)}`,
        ),
        limit: input.payload.limit ?? 8,
      }),
    });
    answer = result.answer;
  } catch (error) {
    logger.warn(
      {
        actorId: input.actorId,
        ideaId: input.payload.ideaId,
        mode: input.payload.mode,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Speaking idea mapping suggestion AI call failed",
    );
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Idea mapping suggestions are not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const parsed = parseSuggestionAnswer(answer, "questionId");
  const allowedIds = new Set(candidateQuestions.map((question) => question.id));
  return parsed.filter((item) => allowedIds.has(item.targetId)).slice(0, input.payload.limit ?? 8);
}
