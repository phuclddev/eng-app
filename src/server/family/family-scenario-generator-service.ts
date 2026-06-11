import {
  AppError,
  NotFoundError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  FamilyChildFocus,
  FamilyChunkChildFocus,
  FamilyScenarioGenerateSummary,
  FamilyScenarioRecord,
} from "@/lib/types";
import { clamp } from "@/lib/utils";
import type { FamilyScenarioGeneratePayload } from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildFamilyScenarioGeneratorPrompt } from "@/server/ai/prompts/family-scenario-generator";
import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";
import { normalizeFamilyScenarioTitle } from "@/server/family/family-scenario-helpers";
import { prisma } from "@/server/prisma";

type ParsedScenario = {
  title: string;
  category: string;
  childFocus: FamilyChildFocus;
  description: string;
  difficulty: number;
  suggestedGoals: string[];
  suggestedChunks: string[];
  aiReason: string;
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

function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    )
    .map((item) => item.trim())
    .slice(0, max);
}

function asChildFocus(value: unknown): FamilyChildFocus {
  if (
    typeof value !== "string"
  ) {
    return "BOTH";
  }
  const candidate = value.trim().toUpperCase();
  if (candidate === "KIWI" || candidate === "VIVI") {
    return candidate;
  }
  return "BOTH";
}

function parseGeneratorResponse(answer: string): ParsedScenario[] {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJsonCandidate(answer));
  } catch {
    throw new AppError(
      "AI returned an invalid scenario response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { scenarios?: unknown }).scenarios)
      ? ((raw as { scenarios: unknown[] }).scenarios)
      : Array.isArray(raw)
        ? raw
        : null;

  if (!list || list.length === 0) {
    throw new AppError(
      "AI returned no scenarios.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const parsed: ParsedScenario[] = [];

  for (const candidate of list) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const title =
      typeof record.title === "string" ? record.title.trim() : "";
    const category =
      typeof record.category === "string" ? record.category.trim() : "";
    const description =
      typeof record.description === "string" ? record.description.trim() : "";

    if (title.length < 3 || category.length < 2 || description.length < 12) {
      continue;
    }

    const difficultyRaw =
      typeof record.difficulty === "number"
        ? record.difficulty
        : Number(record.difficulty);
    const difficulty = Number.isFinite(difficultyRaw)
      ? clamp(Math.round(difficultyRaw), 1, 5)
      : 2;

    const aiReason =
      typeof record.aiReason === "string" ? record.aiReason.trim() : "";

    parsed.push({
      title: title.slice(0, 191),
      category: category.slice(0, 120),
      childFocus: asChildFocus(record.childFocus),
      description: description.slice(0, 4000),
      difficulty,
      suggestedGoals: asStringArray(record.suggestedGoals, 6).map((value) =>
        value.slice(0, 300),
      ),
      suggestedChunks: asStringArray(record.suggestedChunks, 8).map((value) =>
        value.slice(0, 200),
      ),
      aiReason: aiReason.slice(0, 1200),
    });
  }

  if (parsed.length === 0) {
    throw new AppError(
      "AI scenario response did not contain any usable scenarios.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  return parsed;
}

function deriveChildFocus(
  parsed: ParsedScenario,
  payloadFocus?: FamilyChunkChildFocus,
): FamilyChildFocus {
  if (payloadFocus && payloadFocus !== "GENERAL") {
    return payloadFocus as FamilyChildFocus;
  }
  return parsed.childFocus;
}

export async function generateFamilyScenarios(input: {
  userId: string;
  email?: null | string;
  payload: FamilyScenarioGeneratePayload;
}): Promise<FamilyScenarioGenerateSummary> {
  const profile = await getActiveFamilyProfileForUser({
    userId: input.userId,
  });

  if (!profile) {
    throw new NotFoundError(
      "Create or activate a family profile before generating scenarios.",
    );
  }

  const existingScenarios = input.payload.includeExistingContext
    ? await prisma.familyScenario.findMany({
        where: { userId: input.userId },
        select: {
          title: true,
          category: true,
          status: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 60,
      })
    : [];

  const existingTitles = new Set(
    existingScenarios.map((scenario) =>
      normalizeFamilyScenarioTitle(scenario.title),
    ),
  );

  const promptQuery = buildFamilyScenarioGeneratorPrompt({
    familySummary: buildCompactFamilyProfileSummary(profile.profileMarkdown),
    count: input.payload.count,
    childFocus: input.payload.childFocus ?? undefined,
    category: input.payload.category ?? undefined,
    existingScenarioLines: existingScenarios.map(
      (scenario) => `${scenario.title} · ${scenario.category} (${scenario.status})`,
    ),
  });

  let aiAnswer: string;
  try {
    const result = await callAiTutor({ query: promptQuery });
    aiAnswer = result.answer;
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        count: input.payload.count,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family scenario generation AI call failed",
    );

    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Family scenario generation is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const parsedScenarios = parseGeneratorResponse(aiAnswer);

  const warnings: string[] = [];
  const dedupedByNormalizedTitle = new Map<string, ParsedScenario>();
  let skippedDuplicates = 0;

  for (const candidate of parsedScenarios) {
    const normalizedTitle = normalizeFamilyScenarioTitle(candidate.title);
    if (!normalizedTitle) {
      continue;
    }
    if (existingTitles.has(normalizedTitle)) {
      skippedDuplicates += 1;
      continue;
    }
    if (dedupedByNormalizedTitle.has(normalizedTitle)) {
      skippedDuplicates += 1;
      continue;
    }
    dedupedByNormalizedTitle.set(normalizedTitle, candidate);
  }

  const prepared = [...dedupedByNormalizedTitle.values()];

  if (prepared.length === 0) {
    return {
      created: 0,
      skippedDuplicates,
      scenarios: [],
      warnings: [
        "No new scenarios were generated. Try changing the focus or category, or regenerate later.",
      ],
    };
  }

  const created: FamilyScenarioRecord[] = [];

  for (const candidate of prepared) {
    const normalizedTitle = normalizeFamilyScenarioTitle(candidate.title);

    try {
      const row = await prisma.familyScenario.create({
        data: {
          userId: input.userId,
          title: candidate.title,
          normalizedTitle,
          category: candidate.category,
          childFocus: deriveChildFocus(candidate, input.payload.childFocus),
          description: candidate.description,
          difficulty: candidate.difficulty,
          isActive: false,
          status: "SUGGESTED",
          source: "AI",
          aiReason: candidate.aiReason || null,
          suggestedGoals: candidate.suggestedGoals,
          suggestedChunks: candidate.suggestedChunks,
        },
      });

      created.push({
        id: row.id,
        userId: row.userId,
        title: row.title,
        category: row.category,
        childFocus: row.childFocus,
        description: row.description,
        difficulty: row.difficulty,
        isActive: row.isActive,
        status: row.status,
        source: row.source,
        aiReason: row.aiReason,
        suggestedGoals: candidate.suggestedGoals,
        suggestedChunks: candidate.suggestedChunks,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
    } catch (error) {
      skippedDuplicates += 1;
      warnings.push(
        `Could not save scenario "${candidate.title}": ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  logger.info(
    {
      userId: input.userId,
      requested: input.payload.count,
      parsed: parsedScenarios.length,
      created: created.length,
      skippedDuplicates,
    },
    "Family scenario generation completed",
  );

  return {
    created: created.length,
    skippedDuplicates,
    scenarios: created,
    warnings,
  };
}
