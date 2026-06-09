import { z } from "zod";

import {
  FAMILY_CHUNK_CHILD_FOCUS,
  FAMILY_CHUNK_STATUSES,
  FAMILY_SPEAKER_ROLES,
} from "@/lib/constants";
import { AppError, NotFoundError, ValidationError } from "@/lib/errors";
import type {
  FamilyChunkRecord,
  FamilyChunkSnapshot,
} from "@/lib/types";
import type { FamilyChunkFormValues } from "@/lib/validation";
import { normalizeText } from "@/lib/utils";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildFamilyChunkExtractionPrompt } from "@/server/ai/prompts/family-chunk-extraction";
import { prisma } from "@/server/prisma";

import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";

type FamilyChunkModel = {
  id: string;
  userId: string;
  text: string;
  meaningVi: string;
  usageContext: string;
  speakerRole: "FATHER" | "CHILD" | "MOTHER" | "GRANDPARENT" | "GENERAL";
  childFocus: "KIWI" | "VIVI" | "BOTH" | "GENERAL";
  scenarioCategory: string;
  difficulty: number;
  frequencyScore: number;
  personalizationScore: number;
  exampleSentence: string | null;
  notes: string | null;
  sourceConversationId: string | null;
  status: "SUGGESTED" | "APPROVED" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
};

type FamilyChunkExtractionSummary = {
  created: number;
  skippedDuplicates: number;
  errors: string[];
};

type ParsedExtractedFamilyChunk = {
  text: string;
  meaningVi: string;
  usageContext: string;
  speakerRole: "FATHER" | "CHILD" | "MOTHER" | "GRANDPARENT" | "GENERAL";
  childFocus: "KIWI" | "VIVI" | "BOTH" | "GENERAL";
  scenarioCategory: string;
  difficulty: number;
  frequencyScore: number;
  personalizationScore: number;
  exampleSentence: string | null;
  notes: string | null;
};

const familyChunkStatusSchema = z.enum(FAMILY_CHUNK_STATUSES);
const familyChunkChildFocusSchema = z.enum(FAMILY_CHUNK_CHILD_FOCUS);
const familySpeakerRoleSchema = z.enum(FAMILY_SPEAKER_ROLES);

const parsedFamilyChunkSchema = z.object({
  text: z.string().trim().min(2).max(191),
  meaningVi: z.string().trim().min(2).max(255),
  usageContext: z.string().trim().min(5).max(4000),
  speakerRole: familySpeakerRoleSchema,
  childFocus: familyChunkChildFocusSchema,
  scenarioCategory: z.string().trim().min(2).max(120),
  difficulty: z.coerce.number().int().min(1).max(5),
  frequencyScore: z.coerce.number().int().min(1).max(5),
  personalizationScore: z.coerce.number().int().min(1).max(5),
  exampleSentence: z.string().trim().min(2).max(4000).nullable(),
  notes: z.string().trim().min(2).max(4000).nullable(),
});

function mapFamilyChunk(chunk: FamilyChunkModel): FamilyChunkRecord {
  return {
    id: chunk.id,
    userId: chunk.userId,
    text: chunk.text,
    meaningVi: chunk.meaningVi,
    usageContext: chunk.usageContext,
    speakerRole: chunk.speakerRole,
    childFocus: chunk.childFocus,
    scenarioCategory: chunk.scenarioCategory,
    difficulty: chunk.difficulty,
    frequencyScore: chunk.frequencyScore,
    personalizationScore: chunk.personalizationScore,
    exampleSentence: chunk.exampleSentence,
    notes: chunk.notes,
    sourceConversationId: chunk.sourceConversationId,
    status: chunk.status,
    createdAt: chunk.createdAt.toISOString(),
    updatedAt: chunk.updatedAt.toISOString(),
  };
}

function normalizeFamilyChunkText(value: string) {
  return normalizeText(value).slice(0, 191);
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeEnumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (allowed as readonly string[]).includes(candidate)
    ? (candidate as T[number])
    : fallback;
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

  const firstBracket = answer.indexOf("[");
  const lastBracket = answer.lastIndexOf("]");

  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return answer.slice(firstBracket, lastBracket + 1).trim();
  }

  return answer.trim();
}

function parseExtractedFamilyChunks(input: {
  answer: string;
  defaultChildFocus: "BOTH" | "KIWI" | "VIVI";
  defaultScenarioCategory: string;
}) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonCandidate(input.answer));
  } catch {
    throw new AppError(
      "AI could not return valid family chunks. Please try extracting again.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const rawChunks =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { chunks?: unknown }).chunks)
        ? (parsed as { chunks: unknown[] }).chunks
        : null;

  if (!rawChunks || rawChunks.length === 0) {
    throw new AppError(
      "AI could not return valid family chunks. Please try extracting again.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  try {
    return rawChunks.map((rawChunk) =>
      parsedFamilyChunkSchema.parse({
        text:
          rawChunk && typeof rawChunk === "object" && "text" in rawChunk
            ? (rawChunk as { text?: unknown }).text
            : "",
        meaningVi:
          rawChunk && typeof rawChunk === "object" && "meaningVi" in rawChunk
            ? (rawChunk as { meaningVi?: unknown }).meaningVi
            : "",
        usageContext:
          rawChunk && typeof rawChunk === "object" && "usageContext" in rawChunk
            ? (rawChunk as { usageContext?: unknown }).usageContext
            : "",
        speakerRole: normalizeEnumValue(
          rawChunk && typeof rawChunk === "object" && "speakerRole" in rawChunk
            ? (rawChunk as { speakerRole?: unknown }).speakerRole
            : undefined,
          FAMILY_SPEAKER_ROLES,
          "GENERAL",
        ),
        childFocus: normalizeEnumValue(
          rawChunk && typeof rawChunk === "object" && "childFocus" in rawChunk
            ? (rawChunk as { childFocus?: unknown }).childFocus
            : undefined,
          FAMILY_CHUNK_CHILD_FOCUS,
          input.defaultChildFocus,
        ),
        scenarioCategory:
          normalizeOptionalText(
            rawChunk && typeof rawChunk === "object" && "scenarioCategory" in rawChunk
              ? (rawChunk as { scenarioCategory?: unknown }).scenarioCategory
              : undefined,
          ) ?? input.defaultScenarioCategory,
        difficulty:
          rawChunk && typeof rawChunk === "object" && "difficulty" in rawChunk
            ? (rawChunk as { difficulty?: unknown }).difficulty
            : 1,
        frequencyScore:
          rawChunk && typeof rawChunk === "object" && "frequencyScore" in rawChunk
            ? (rawChunk as { frequencyScore?: unknown }).frequencyScore
            : 1,
        personalizationScore:
          rawChunk && typeof rawChunk === "object" && "personalizationScore" in rawChunk
            ? (rawChunk as { personalizationScore?: unknown }).personalizationScore
            : 1,
        exampleSentence: normalizeOptionalText(
          rawChunk && typeof rawChunk === "object" && "exampleSentence" in rawChunk
            ? (rawChunk as { exampleSentence?: unknown }).exampleSentence
            : undefined,
        ),
        notes: normalizeOptionalText(
          rawChunk && typeof rawChunk === "object" && "notes" in rawChunk
            ? (rawChunk as { notes?: unknown }).notes
            : undefined,
        ),
      }),
    ) as ParsedExtractedFamilyChunk[];
  } catch {
    throw new AppError(
      "AI returned family chunks in an unsupported format. Please try again.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }
}

async function assertSourceConversationOwnership(input: {
  sourceConversationId: null | string;
  userId: string;
}) {
  if (!input.sourceConversationId) {
    return;
  }

  const existingConversation = await prisma.familyConversation.findFirst({
    where: {
      id: input.sourceConversationId,
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingConversation) {
    throw new NotFoundError("Source family conversation was not found.");
  }
}

async function assertUniqueFamilyChunk(input: {
  chunkId?: string;
  normalizedText: string;
  userId: string;
}) {
  const duplicate = await prisma.familyChunk.findFirst({
    where: {
      userId: input.userId,
      normalizedText: input.normalizedText,
      ...(input.chunkId ? { NOT: { id: input.chunkId } } : {}),
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!duplicate) {
    return;
  }

  if (duplicate.status === "ARCHIVED") {
    throw new ValidationError(
      "This family chunk already exists in your archive. Restore it instead of creating a duplicate.",
    );
  }

  throw new ValidationError("This family chunk already exists in your library.");
}

export async function listFamilyChunks(input: {
  userId: string;
}) {
  const chunks = await prisma.familyChunk.findMany({
    where: {
      userId: input.userId,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return chunks.map(mapFamilyChunk);
}

export async function getFamilyChunkSnapshot(input: {
  userId: string;
}): Promise<FamilyChunkSnapshot> {
  const [totalApprovedChunks, totalSuggestedChunks] = await Promise.all([
    prisma.familyChunk.count({
      where: {
        userId: input.userId,
        status: "APPROVED",
      },
    }),
    prisma.familyChunk.count({
      where: {
        userId: input.userId,
        status: "SUGGESTED",
      },
    }),
  ]);

  return {
    totalApprovedChunks,
    totalSuggestedChunks,
  };
}

export async function saveFamilyChunk(input: {
  userId: string;
  values: FamilyChunkFormValues;
}) {
  const normalizedText = normalizeFamilyChunkText(input.values.text);

  if (!normalizedText) {
    throw new ValidationError("Family chunk text is required.");
  }

  await assertSourceConversationOwnership({
    userId: input.userId,
    sourceConversationId: input.values.sourceConversationId,
  });
  await assertUniqueFamilyChunk({
    userId: input.userId,
    chunkId: input.values.id,
    normalizedText,
  });

  if (input.values.id) {
    const existing = await prisma.familyChunk.findFirst({
      where: {
        id: input.values.id,
        userId: input.userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundError("Family chunk was not found.");
    }

    const updated = await prisma.familyChunk.update({
      where: {
        id: input.values.id,
      },
      data: {
        text: input.values.text,
        normalizedText,
        meaningVi: input.values.meaningVi,
        usageContext: input.values.usageContext,
        speakerRole: input.values.speakerRole,
        childFocus: input.values.childFocus,
        scenarioCategory: input.values.scenarioCategory,
        difficulty: input.values.difficulty,
        frequencyScore: input.values.frequencyScore,
        personalizationScore: input.values.personalizationScore,
        exampleSentence: input.values.exampleSentence,
        notes: input.values.notes,
        sourceConversationId: input.values.sourceConversationId,
        status: input.values.status,
      },
    });

    return mapFamilyChunk(updated);
  }

  const created = await prisma.familyChunk.create({
    data: {
      userId: input.userId,
      text: input.values.text,
      normalizedText,
      meaningVi: input.values.meaningVi,
      usageContext: input.values.usageContext,
      speakerRole: input.values.speakerRole,
      childFocus: input.values.childFocus,
      scenarioCategory: input.values.scenarioCategory,
      difficulty: input.values.difficulty,
      frequencyScore: input.values.frequencyScore,
      personalizationScore: input.values.personalizationScore,
      exampleSentence: input.values.exampleSentence,
      notes: input.values.notes,
      sourceConversationId: input.values.sourceConversationId,
      status: input.values.status,
    },
  });

  return mapFamilyChunk(created);
}

export async function setFamilyChunkStatus(input: {
  chunkId: string;
  status: "APPROVED" | "ARCHIVED" | "SUGGESTED";
  userId: string;
}) {
  familyChunkStatusSchema.parse(input.status);

  const existing = await prisma.familyChunk.findFirst({
    where: {
      id: input.chunkId,
      userId: input.userId,
    },
  });

  if (!existing) {
    throw new NotFoundError("Family chunk was not found.");
  }

  const updated = await prisma.familyChunk.update({
    where: {
      id: input.chunkId,
    },
    data: {
      status: input.status,
    },
  });

  return mapFamilyChunk(updated);
}

export async function bulkSetFamilyChunkStatus(input: {
  chunkIds: string[];
  status: "APPROVED" | "ARCHIVED" | "SUGGESTED";
  userId: string;
}) {
  familyChunkStatusSchema.parse(input.status);
  const uniqueChunkIds = [...new Set(input.chunkIds)];

  const existing = await prisma.familyChunk.findMany({
    where: {
      id: {
        in: uniqueChunkIds,
      },
      userId: input.userId,
    },
    select: {
      id: true,
    },
  });

  if (existing.length !== uniqueChunkIds.length) {
    throw new NotFoundError("One or more family chunks were not found.");
  }

  await prisma.familyChunk.updateMany({
    where: {
      id: {
        in: uniqueChunkIds,
      },
      userId: input.userId,
    },
    data: {
      status: input.status,
    },
  });

  const updated = await prisma.familyChunk.findMany({
    where: {
      id: {
        in: uniqueChunkIds,
      },
      userId: input.userId,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return updated.map(mapFamilyChunk);
}

export async function extractFamilyChunksFromConversation(input: {
  conversationId: string;
  userId: string;
}) {
  const conversation = await prisma.familyConversation.findFirst({
    where: {
      id: input.conversationId,
      userId: input.userId,
    },
    include: {
      scenario: {
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
        },
      },
    },
  });

  if (!conversation) {
    throw new NotFoundError("Family conversation was not found.");
  }

  const profile = await getActiveFamilyProfileForUser({
    userId: input.userId,
  });

  const { answer } = await callAiTutor({
    query: buildFamilyChunkExtractionPrompt({
      familySummary: profile
        ? buildCompactFamilyProfileSummary(profile.profileMarkdown)
        : "No active family profile is available. Use only the conversation context.",
      scenarioCategory: conversation.scenario.category,
      scenarioDescription: conversation.scenario.description,
      conversationMarkdown: conversation.conversationMarkdown,
      childFocus: conversation.childFocus,
    }),
  });

  const parsedChunks = parseExtractedFamilyChunks({
    answer,
    defaultChildFocus: conversation.childFocus,
    defaultScenarioCategory: conversation.scenario.category,
  });

  const uniquePreparedChunks = new Map<
    string,
    ParsedExtractedFamilyChunk & { normalizedText: string }
  >();
  let skippedDuplicates = 0;

  for (const parsedChunk of parsedChunks) {
    const normalizedText = normalizeFamilyChunkText(parsedChunk.text);

    if (!normalizedText) {
      throw new AppError(
        "AI returned an invalid family chunk.",
        502,
        "AI_TUTOR_INVALID_RESPONSE",
      );
    }

    if (uniquePreparedChunks.has(normalizedText)) {
      skippedDuplicates += 1;
      continue;
    }

    uniquePreparedChunks.set(normalizedText, {
      ...parsedChunk,
      normalizedText,
    });
  }

  const preparedChunks = [...uniquePreparedChunks.values()];
  const existingDuplicates =
    preparedChunks.length === 0
      ? []
      : await prisma.familyChunk.findMany({
          where: {
            userId: input.userId,
            normalizedText: {
              in: preparedChunks.map((chunk) => chunk.normalizedText),
            },
          },
          select: {
            normalizedText: true,
          },
        });
  const existingDuplicateSet = new Set(
    existingDuplicates.map((chunk) => chunk.normalizedText),
  );
  const createPayload = preparedChunks.filter((chunk) => {
    if (existingDuplicateSet.has(chunk.normalizedText)) {
      skippedDuplicates += 1;
      return false;
    }

    return true;
  });

  if (createPayload.length > 0) {
    await prisma.$transaction(
      createPayload.map((chunk) =>
        prisma.familyChunk.create({
          data: {
            userId: input.userId,
            text: chunk.text,
            normalizedText: chunk.normalizedText,
            meaningVi: chunk.meaningVi,
            usageContext: chunk.usageContext,
            speakerRole: chunk.speakerRole,
            childFocus: chunk.childFocus,
            scenarioCategory: chunk.scenarioCategory,
            difficulty: chunk.difficulty,
            frequencyScore: chunk.frequencyScore,
            personalizationScore: chunk.personalizationScore,
            exampleSentence: chunk.exampleSentence,
            notes: chunk.notes,
            sourceConversationId: conversation.id,
            status: "SUGGESTED",
          },
        }),
      ),
    );
  }

  return {
    summary: {
      created: createPayload.length,
      skippedDuplicates,
      errors: [],
    } satisfies FamilyChunkExtractionSummary,
  };
}
