import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  TranslationAiChunkExtractResponse,
  TranslationChunkMappingRecord,
} from "@/lib/types";
import { clamp, slugify } from "@/lib/utils";
import type {
  TranslationExtractChunkPayload,
  TranslationSaveChunkPayload,
} from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildTranslationChunkExtractPrompt } from "@/server/ai/prompts/translation-chunk-extract";
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

function parseExtractedChunk(answer: string): TranslationAiChunkExtractResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonCandidate(answer));
  } catch {
    throw new AppError(
      "AI returned an invalid translation chunk response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new AppError(
      "AI returned an invalid translation chunk response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const record = parsed as Record<string, unknown>;
  const chunk =
    typeof record.chunk === "string" ? record.chunk.trim() : "";
  const meaningVi =
    typeof record.meaningVi === "string" ? record.meaningVi.trim() : "";
  const usage = typeof record.usage === "string" ? record.usage.trim() : "";
  const example =
    typeof record.example === "string" ? record.example.trim() : "";
  const suggestedTopic =
    typeof record.suggestedTopic === "string"
      ? record.suggestedTopic.trim()
      : null;
  const rawBand = record.bandEstimate;
  const bandEstimate =
    typeof rawBand === "number"
      ? clamp(rawBand, 4, 9)
      : typeof rawBand === "string" && rawBand.trim().length > 0
        ? clamp(Number(rawBand), 4, 9)
        : 6;

  if (chunk.length < 2 || meaningVi.length < 2 || example.length < 5) {
    throw new AppError(
      "AI translation chunk response was missing required fields.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  return {
    chunk,
    meaningVi,
    usage,
    example,
    suggestedTopic,
    bandEstimate: Number.isFinite(bandEstimate) ? bandEstimate : 6,
  };
}

export async function extractTranslationChunk(input: {
  userId: string;
  payload: TranslationExtractChunkPayload;
}): Promise<TranslationAiChunkExtractResponse> {
  const sentence = await prisma.translationSentence.findUnique({
    where: { id: input.payload.sentenceId },
    include: {
      script: {
        select: {
          title: true,
          topic: true,
          bandLevel: true,
        },
      },
    },
  });

  if (!sentence) {
    throw new NotFoundError("Translation sentence was not found.");
  }

  try {
    const response = await callAiTutor({
      query: buildTranslationChunkExtractPrompt({
        scriptTitle: sentence.script.title,
        scriptTopic: sentence.script.topic,
        scriptBandLevel: sentence.script.bandLevel,
        englishSentence: sentence.englishText,
        vietnameseSentence: sentence.vietnameseText,
        selectedPhrase: input.payload.englishPhrase,
      }),
    });

    return parseExtractedChunk(response.answer);
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        sentenceId: sentence.id,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Translation chunk extraction failed",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      "Translation chunk extraction is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }
}

async function resolveTopicId(input: {
  topicName: string | null;
}): Promise<string | null> {
  if (!input.topicName || !input.topicName.trim()) {
    return null;
  }

  const name = input.topicName.trim();
  const slug = slugify(name) || name.toLowerCase().slice(0, 64);

  const existing = await prisma.topic.findFirst({
    where: { OR: [{ name }, { slug }] },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.topic.create({
    data: {
      name,
      slug,
    },
  });

  return created.id;
}

export async function saveTranslationChunk(input: {
  userId: string;
  payload: TranslationSaveChunkPayload;
}): Promise<TranslationChunkMappingRecord> {
  const sentence = await prisma.translationSentence.findUnique({
    where: { id: input.payload.sentenceId },
    select: { id: true, scriptId: true },
  });

  if (!sentence) {
    throw new NotFoundError("Translation sentence was not found.");
  }

  const topicId = await resolveTopicId({
    topicName: input.payload.suggestedTopic ?? null,
  });

  const chunk = await prisma.chunk.upsert({
    where: {
      chunk_meaningVi: {
        chunk: input.payload.englishPhrase,
        meaningVi: input.payload.meaningVi,
      },
    },
    create: {
      chunk: input.payload.englishPhrase,
      meaningVi: input.payload.meaningVi,
      example: input.payload.example,
      difficulty: 2,
      bandLevel: input.payload.bandEstimate,
      notes: input.payload.usageContext ?? null,
      tags: input.payload.tags,
      topicId,
      createdById: input.userId,
    },
    update: {
      example: input.payload.example,
      bandLevel: input.payload.bandEstimate,
      notes: input.payload.usageContext ?? null,
      tags: input.payload.tags,
      topicId,
      deletedAt: null,
    },
  });

  const mapping = await prisma.translationChunkMapping.upsert({
    where: {
      sentenceId_englishPhrase: {
        sentenceId: input.payload.sentenceId,
        englishPhrase: input.payload.englishPhrase,
      },
    },
    create: {
      sentenceId: input.payload.sentenceId,
      chunkId: chunk.id,
      englishPhrase: input.payload.englishPhrase,
      meaningVi: input.payload.meaningVi,
      usageContext: input.payload.usageContext ?? null,
      exampleSentence: input.payload.example,
      suggestedTopic: input.payload.suggestedTopic ?? null,
      bandEstimate: input.payload.bandEstimate,
      createdById: input.userId,
    },
    update: {
      chunkId: chunk.id,
      meaningVi: input.payload.meaningVi,
      usageContext: input.payload.usageContext ?? null,
      exampleSentence: input.payload.example,
      suggestedTopic: input.payload.suggestedTopic ?? null,
      bandEstimate: input.payload.bandEstimate,
    },
  });

  return {
    id: mapping.id,
    sentenceId: mapping.sentenceId,
    englishPhrase: mapping.englishPhrase,
    meaningVi: mapping.meaningVi,
    chunkId: mapping.chunkId,
    suggestedTopic: mapping.suggestedTopic,
    bandEstimate: mapping.bandEstimate,
  };
}
