import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  SpeakingIdeaGenerationSummary,
  SpeakingIdeaSupportType,
} from "@/lib/types";
import { clamp } from "@/lib/utils";
import type { SpeakingIdeaGeneratePayload } from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildIeltsSpeakingIdeaGeneratorPrompt } from "@/server/ai/prompts/ielts-speaking-idea-generator";
import {
  createGeneratedSpeakingIdeas,
  getSpeakingIdeaIdentitySnapshot,
  normalizeSpeakingIdeaIdentity,
} from "@/server/data/speaking-ideas";

const VALID_SUPPORT_TYPES: ReadonlySet<SpeakingIdeaSupportType> = new Set([
  "REASON",
  "EXAMPLE",
  "RESULT",
  "CONTRAST",
  "DETAIL",
  "PERSONAL_EXPERIENCE",
]);

type ParsedGeneratedIdea = {
  title: string;
  shortLabel: string;
  descriptionVi: string;
  descriptionEn: string;
  popularityScore: number;
  reuseScore: number;
  aiReason: string | null;
  exampleQuestions: string[];
  variants: Array<{
    bandLevel: number;
    phrase: string;
    exampleSentence: string;
  }>;
  supports: Array<{
    supportType: SpeakingIdeaSupportType;
    text: string;
    example: string | null;
  }>;
  patterns: Array<{
    patternText: string;
    variablesJson: null;
    exampleAnswer: string;
  }>;
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

function asSupportType(value: unknown): SpeakingIdeaSupportType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return VALID_SUPPORT_TYPES.has(normalized as SpeakingIdeaSupportType)
    ? (normalized as SpeakingIdeaSupportType)
    : null;
}

export function parseSpeakingIdeaGeneratorAnswer(answer: string): ParsedGeneratedIdea[] {
  let raw: unknown;

  try {
    raw = JSON.parse(extractJsonCandidate(answer));
  } catch {
    throw new AppError(
      "AI returned an invalid speaking idea generator response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { ideas?: unknown }).ideas)
      ? (raw as { ideas: unknown[] }).ideas
      : Array.isArray(raw)
        ? raw
        : null;

  if (!list || list.length === 0) {
    throw new AppError(
      "AI returned no reusable speaking ideas.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const parsed: ParsedGeneratedIdea[] = [];

  for (const candidate of list) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const record = candidate as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const shortLabel =
      typeof record.shortLabel === "string" ? record.shortLabel.trim() : "";
    const descriptionVi =
      typeof record.descriptionVi === "string" ? record.descriptionVi.trim() : "";
    const descriptionEn =
      typeof record.descriptionEn === "string" ? record.descriptionEn.trim() : "";

    if (
      title.length < 2 ||
      shortLabel.length < 2 ||
      descriptionVi.length < 10 ||
      descriptionEn.length < 10
    ) {
      continue;
    }

    const variantsRaw = Array.isArray(record.variants) ? record.variants : [];
    const supportsRaw = Array.isArray(record.supports) ? record.supports : [];
    const patternsRaw = Array.isArray(record.patterns) ? record.patterns : [];
    const exampleQuestionsRaw = Array.isArray(record.exampleQuestions)
      ? record.exampleQuestions
      : [];

    const variants = variantsRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        bandLevel: clamp(
          Number.isFinite(Number(item.bandLevel)) ? Number(item.bandLevel) : 6.5,
          4,
          9,
        ),
        phrase: typeof item.phrase === "string" ? item.phrase.trim().slice(0, 191) : "",
        exampleSentence:
          typeof item.exampleSentence === "string"
            ? item.exampleSentence.trim().slice(0, 4000)
            : "",
      }))
      .filter((item) => item.phrase.length >= 2 && item.exampleSentence.length >= 5)
      .slice(0, 3);

    const supports = supportsRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        supportType: asSupportType(item.supportType),
        text: typeof item.text === "string" ? item.text.trim().slice(0, 4000) : "",
        example:
          typeof item.example === "string" && item.example.trim().length > 0
            ? item.example.trim().slice(0, 4000)
            : null,
      }))
      .filter(
        (item): item is { supportType: SpeakingIdeaSupportType; text: string; example: string | null } =>
          Boolean(item.supportType) && item.text.length >= 5,
      )
      .slice(0, 5);

    const patterns = patternsRaw
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        patternText:
          typeof item.patternText === "string" ? item.patternText.trim().slice(0, 4000) : "",
        variablesJson: null,
        exampleAnswer:
          typeof item.exampleAnswer === "string"
            ? item.exampleAnswer.trim().slice(0, 6000)
            : "",
      }))
      .filter((item) => item.patternText.length >= 5 && item.exampleAnswer.length >= 5)
      .slice(0, 3);

    const popularityScore = clamp(
      Math.round(Number.isFinite(Number(record.popularityScore)) ? Number(record.popularityScore) : 3),
      1,
      5,
    );
    const reuseScore = clamp(
      Math.round(Number.isFinite(Number(record.reuseScore)) ? Number(record.reuseScore) : 3),
      1,
      5,
    );

    const exampleQuestions = exampleQuestionsRaw
      .filter((item): item is string => typeof item === "string" && item.trim().length >= 5)
      .map((item) => item.trim().slice(0, 300))
      .slice(0, 4);

    parsed.push({
      title: title.slice(0, 191),
      shortLabel: shortLabel.slice(0, 80),
      descriptionVi: descriptionVi.slice(0, 6000),
      descriptionEn: descriptionEn.slice(0, 6000),
      popularityScore,
      reuseScore,
      aiReason:
        typeof record.aiReason === "string" && record.aiReason.trim().length > 0
          ? record.aiReason.trim().slice(0, 1200)
          : null,
      exampleQuestions,
      variants,
      supports,
      patterns,
    });
  }

  if (parsed.length === 0) {
    throw new AppError(
      "AI did not return any usable reusable ideas.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  return parsed;
}

export async function generateSpeakingIdeas(input: {
  actorId: string;
  payload: SpeakingIdeaGeneratePayload;
}): Promise<SpeakingIdeaGenerationSummary> {
  const batchId = randomUUID();
  const warnings: string[] = [];
  const parseErrors: string[] = [];

  const identitySnapshot = await getSpeakingIdeaIdentitySnapshot();

  let answer: string;

  try {
    const result = await callAiTutor({
      query: buildIeltsSpeakingIdeaGeneratorPrompt({
        topic: input.payload.topic ?? null,
        count: input.payload.count,
        targetBand: input.payload.targetBand,
        includeExistingContext: input.payload.includeExistingContext,
        existingIdeaLines: input.payload.includeExistingContext
          ? identitySnapshot.titles.map((title, index) => {
              const shortLabel = identitySnapshot.shortLabels[index];
              return `${title}${shortLabel ? ` (${shortLabel})` : ""}`;
            })
          : [],
      }),
    });
    answer = result.answer;
  } catch (error) {
    logger.warn(
      {
        actorId: input.actorId,
        batchId,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Speaking idea generator AI call failed",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Speaking idea generation is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const parsedIdeas = parseSpeakingIdeaGeneratorAnswer(answer);
  const seenTitles = new Set(identitySnapshot.normalizedTitles);
  const seenShortLabels = new Set(identitySnapshot.normalizedShortLabels);
  let skippedDuplicates = 0;

  const accepted = parsedIdeas.filter((idea) => {
    const normalizedTitle = normalizeSpeakingIdeaIdentity(idea.title);
    const normalizedShortLabel = normalizeSpeakingIdeaIdentity(idea.shortLabel);

    if (
      !normalizedTitle ||
      !normalizedShortLabel ||
      seenTitles.has(normalizedTitle) ||
      seenShortLabels.has(normalizedShortLabel)
    ) {
      skippedDuplicates += 1;
      return false;
    }

    seenTitles.add(normalizedTitle);
    seenShortLabels.add(normalizedShortLabel);
    return true;
  });

  if (accepted.length === 0) {
    warnings.push(
      "No new reusable ideas were generated. Try a different topic or regenerate later.",
    );
    return {
      batchId,
      created: 0,
      skippedDuplicates,
      parseErrors,
      warnings,
      ideas: [],
    };
  }

  const created = await createGeneratedSpeakingIdeas({
    batchId,
    ideas: accepted,
  });

  logger.info(
    {
      actorId: input.actorId,
      batchId,
      requested: input.payload.count,
      parsed: parsedIdeas.length,
      created: created.length,
      skippedDuplicates,
    },
    "Speaking idea generation completed",
  );

  return {
    batchId,
    created: created.length,
    skippedDuplicates,
    parseErrors,
    warnings,
    ideas: created,
  };
}
