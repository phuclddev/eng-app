import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  TranslationRecallAttemptMode,
  TranslationRecallAttemptRecord,
  TranslationRecallCompareResponse,
  TranslationRecallMissingChunk,
} from "@/lib/types";
import { clamp } from "@/lib/utils";
import type { TranslationComparePayload } from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildTranslationRecallComparePrompt } from "@/server/ai/prompts/translation-recall-compare";
import { prisma } from "@/server/prisma";

const SCORE_HEADING_REGEX = /#\s*Score\s*\n+\s*(\d{1,3})/i;
const MISSING_CHUNKS_BLOCK_REGEX =
  /#\s*Missing Chunks\s*([\s\S]*?)(?=\n#\s|$)/i;
const MISSING_CHUNK_BULLET_REGEX =
  /-\s+\*\*(.+?)\*\*\s*(?:=|—|-)?\s*(.+)?/g;

export function parseTranslationCompareScore(markdown: string): number | null {
  const match = markdown.match(SCORE_HEADING_REGEX);
  if (!match || !match[1]) {
    return null;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return clamp(Math.round(parsed), 0, 100);
}

export function parseTranslationCompareMissingChunks(
  markdown: string,
): TranslationRecallMissingChunk[] {
  const block = markdown.match(MISSING_CHUNKS_BLOCK_REGEX);
  if (!block || !block[1]) {
    return [];
  }

  const body = block[1].trim();
  if (!body || body.includes("(none)") || body === "-") {
    return [];
  }

  const results: TranslationRecallMissingChunk[] = [];
  const seen = new Set<string>();
  let bulletMatch: RegExpExecArray | null;

  MISSING_CHUNK_BULLET_REGEX.lastIndex = 0;
  while ((bulletMatch = MISSING_CHUNK_BULLET_REGEX.exec(body)) !== null) {
    const chunk = bulletMatch[1]?.trim();
    if (!chunk) {
      continue;
    }
    if (seen.has(chunk.toLowerCase())) {
      continue;
    }
    seen.add(chunk.toLowerCase());
    const meaningRaw = bulletMatch[2]?.trim();
    const meaning =
      meaningRaw && meaningRaw.length > 0 && meaningRaw !== "(none)"
        ? meaningRaw
        : null;
    results.push({ chunk: chunk.slice(0, 191), meaningVi: meaning });
  }

  return results;
}

async function loadScriptOrThrow(scriptId: string) {
  const script = await prisma.translationScript.findUnique({
    where: { id: scriptId },
    include: {
      sentences: {
        orderBy: { orderIndex: "asc" },
      },
    },
  });
  if (!script) {
    throw new NotFoundError("Translation script was not found.");
  }
  return script;
}

function buildVietnameseSource(input: {
  mode: TranslationRecallAttemptMode;
  vietnameseSentence: string | null;
  vietnameseFullScript: string;
}): string {
  if (input.mode === "SENTENCE" && input.vietnameseSentence) {
    return input.vietnameseSentence;
  }
  return input.vietnameseFullScript;
}

function buildOriginalEnglish(input: {
  mode: TranslationRecallAttemptMode;
  englishSentence: string | null;
  englishFullScript: string;
}): string {
  if (input.mode === "SENTENCE" && input.englishSentence) {
    return input.englishSentence;
  }
  return input.englishFullScript;
}

export async function compareTranslationRecallAttempt(input: {
  userId: string;
  payload: TranslationComparePayload;
}): Promise<TranslationRecallCompareResponse> {
  const script = await loadScriptOrThrow(input.payload.scriptId);

  let sentence: typeof script.sentences[number] | null = null;
  if (input.payload.mode === "SENTENCE") {
    if (!input.payload.sentenceId) {
      throw new AppError(
        "Sentence id is required for sentence comparisons.",
        400,
        "VALIDATION_ERROR",
      );
    }
    sentence =
      script.sentences.find(
        (item) => item.id === input.payload.sentenceId,
      ) ?? null;
    if (!sentence) {
      throw new NotFoundError("Translation sentence was not found.");
    }
  }

  const vietnameseFullScript = script.sentences
    .map((s) => s.vietnameseText)
    .join("\n");
  const englishFullScript = script.sentences
    .map((s) => s.englishText)
    .join("\n");

  const vietnameseSource = buildVietnameseSource({
    mode: input.payload.mode,
    vietnameseSentence: sentence?.vietnameseText ?? null,
    vietnameseFullScript,
  });
  const originalEnglish = buildOriginalEnglish({
    mode: input.payload.mode,
    englishSentence: sentence?.englishText ?? null,
    englishFullScript,
  });

  const prompt = buildTranslationRecallComparePrompt({
    mode: input.payload.mode,
    scriptTitle: script.title,
    topic: script.topic,
    bandLevel: script.bandLevel,
    vietnameseSource,
    originalEnglish,
    userAnswer: input.payload.userAnswer,
  });

  let aiAnswer: string;
  try {
    const response = await callAiTutor({ query: prompt });
    aiAnswer = response.answer.trim();
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        scriptId: input.payload.scriptId,
        sentenceId: input.payload.sentenceId ?? null,
        mode: input.payload.mode,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Translation Recall compare AI call failed",
    );
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Translation Recall comparison is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  if (!aiAnswer) {
    throw new AppError(
      "AI returned an empty translation comparison.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const score = parseTranslationCompareScore(aiAnswer);
  const missingChunks = parseTranslationCompareMissingChunks(aiAnswer);

  const attempt = await prisma.translationRecallAttempt.create({
    data: {
      userId: input.userId,
      scriptId: script.id,
      sentenceId: sentence?.id ?? null,
      mode: input.payload.mode,
      userAnswer: input.payload.userAnswer,
      score: score ?? null,
      feedbackMarkdown: aiAnswer,
    },
  });

  const record: TranslationRecallAttemptRecord = {
    id: attempt.id,
    scriptId: attempt.scriptId,
    sentenceId: attempt.sentenceId,
    mode: attempt.mode,
    userAnswer: attempt.userAnswer,
    score: attempt.score,
    feedbackMarkdown: attempt.feedbackMarkdown,
    createdAt: attempt.createdAt.toISOString(),
  };

  return {
    attempt: record,
    originalEnglish,
    missingChunks,
  };
}
