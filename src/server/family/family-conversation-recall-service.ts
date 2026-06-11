import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type {
  FamilyChildFocus,
  FamilyConversationRecallAttemptRecord,
  FamilyConversationRecallCompareResponse,
  FamilyConversationRecallCreateResponse,
  FamilyConversationRecallLineRecord,
  FamilyConversationRecallMissingChunk,
  FamilyConversationRecallScript,
} from "@/lib/types";
import { clamp } from "@/lib/utils";
import type {
  FamilyConversationRecallComparePayload,
  FamilyConversationRecallCreatePayload,
} from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildFamilyConversationRecallComparePrompt } from "@/server/ai/prompts/family-conversation-recall-compare";
import { buildFamilyConversationRecallCreatePrompt } from "@/server/ai/prompts/family-conversation-recall-create";
import { buildCompactFamilyProfileSummary } from "@/server/family/family-profile-helpers";
import { getActiveFamilyProfileForUser } from "@/server/family/family-profile-service";
import { prisma } from "@/server/prisma";

const MIN_LINES = 1;
const MAX_LINES = 60;

const SCORE_HEADING_REGEX = /#\s*Score\s*\n+\s*(\d{1,3})/i;
const USEFUL_CHUNKS_BLOCK_REGEX =
  /#\s*Useful Chunks\s*([\s\S]*?)(?=\n#\s|$)/i;
const USEFUL_CHUNK_BULLET_REGEX =
  /-\s+\*\*(.+?)\*\*\s*(?:=|—|-)?\s*(.+)?/g;

type RawLine = {
  speaker: string;
  englishText: string;
  vietnameseText: string;
  usedChunks: string[];
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

function parseCreateRecallResponse(answer: string): RawLine[] {
  let raw: unknown;
  try {
    raw = JSON.parse(extractJsonCandidate(answer));
  } catch {
    throw new AppError(
      "AI returned an invalid recall response.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { lines?: unknown }).lines)
      ? ((raw as { lines: unknown[] }).lines)
      : Array.isArray(raw)
        ? raw
        : null;

  if (!list || list.length === 0) {
    throw new AppError(
      "AI returned no recall lines.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const parsed: RawLine[] = [];
  for (const candidate of list) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }
    const record = candidate as Record<string, unknown>;
    const speaker = typeof record.speaker === "string" ? record.speaker.trim() : "";
    const englishText =
      typeof record.englishText === "string" ? record.englishText.trim() : "";
    const vietnameseText =
      typeof record.vietnameseText === "string" ? record.vietnameseText.trim() : "";
    if (englishText.length < 2 || vietnameseText.length < 2) {
      continue;
    }
    const usedChunksRaw = Array.isArray(record.usedChunks) ? record.usedChunks : [];
    const usedChunks = usedChunksRaw
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      .map((value) => value.trim())
      .slice(0, 5);

    parsed.push({
      speaker: (speaker || "Speaker").slice(0, 48),
      englishText: englishText.slice(0, 4000),
      vietnameseText: vietnameseText.slice(0, 4000),
      usedChunks,
    });

    if (parsed.length >= MAX_LINES) {
      break;
    }
  }

  if (parsed.length < MIN_LINES) {
    throw new AppError(
      "AI recall response did not produce any usable lines.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  return parsed;
}

export function parseFamilyRecallScore(markdown: string): number | null {
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

export function parseFamilyRecallMissingChunks(
  markdown: string,
): FamilyConversationRecallMissingChunk[] {
  const block = markdown.match(USEFUL_CHUNKS_BLOCK_REGEX);
  if (!block || !block[1]) {
    return [];
  }
  const body = block[1].trim();
  if (!body || body.includes("(none)")) {
    return [];
  }

  const results: FamilyConversationRecallMissingChunk[] = [];
  const seen = new Set<string>();
  USEFUL_CHUNK_BULLET_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = USEFUL_CHUNK_BULLET_REGEX.exec(body)) !== null) {
    const chunk = match[1]?.trim();
    if (!chunk) {
      continue;
    }
    const lower = chunk.toLowerCase();
    if (seen.has(lower)) {
      continue;
    }
    seen.add(lower);
    const meaningRaw = match[2]?.trim();
    const meaning =
      meaningRaw && meaningRaw.length > 0 && !/^used\b/i.test(meaningRaw)
        ? meaningRaw.replace(/\((used|missed|đã dùng|còn thiếu).*\)?$/i, "").trim()
        : null;
    results.push({
      chunk: chunk.slice(0, 191),
      meaningVi: meaning && meaning.length > 0 ? meaning.slice(0, 255) : null,
    });
  }

  return results;
}

async function loadConversationOrThrow(input: {
  userId: string;
  conversationId: string;
}) {
  const conversation = await prisma.familyConversation.findFirst({
    where: {
      id: input.conversationId,
      userId: input.userId,
    },
    include: {
      scenario: {
        select: { title: true, category: true, childFocus: true },
      },
    },
  });
  if (!conversation) {
    throw new NotFoundError("Family conversation was not found.");
  }
  return conversation;
}

function mapLine(
  line: {
    id: string;
    conversationId: string;
    orderIndex: number;
    speaker: string;
    englishText: string;
    vietnameseText: string;
    usedChunks: unknown;
    attempts: Array<{
      id: string;
      conversationId: string;
      lineId: string | null;
      mode: "LINE" | "FULL";
      userAnswer: string;
      score: number | null;
      feedbackMarkdown: string;
      createdAt: Date;
    }>;
  },
  attemptCount: number,
): FamilyConversationRecallLineRecord {
  const latest = line.attempts[0] ?? null;
  return {
    id: line.id,
    conversationId: line.conversationId,
    orderIndex: line.orderIndex,
    speaker: line.speaker,
    englishText: line.englishText,
    vietnameseText: line.vietnameseText,
    usedChunks: Array.isArray(line.usedChunks)
      ? (line.usedChunks as unknown[]).filter(
          (value): value is string => typeof value === "string",
        )
      : [],
    latestAttempt: latest
      ? {
          id: latest.id,
          conversationId: latest.conversationId,
          lineId: latest.lineId,
          mode: latest.mode,
          userAnswer: latest.userAnswer,
          score: latest.score,
          feedbackMarkdown: latest.feedbackMarkdown,
          createdAt: latest.createdAt.toISOString(),
        }
      : null,
    attemptCount,
  };
}

export async function getFamilyRecallScript(input: {
  userId: string;
  conversationId: string;
}): Promise<FamilyConversationRecallScript> {
  const conversation = await loadConversationOrThrow({
    userId: input.userId,
    conversationId: input.conversationId,
  });

  const lines = await prisma.familyConversationRecallLine.findMany({
    where: { conversationId: conversation.id },
    orderBy: { orderIndex: "asc" },
    include: {
      attempts: {
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let attemptCountsByLine = new Map<string, number>();
  if (lines.length > 0) {
    const counts = await prisma.familyConversationRecallAttempt.groupBy({
      by: ["lineId"],
      where: {
        userId: input.userId,
        conversationId: conversation.id,
        lineId: { in: lines.map((line) => line.id) },
      },
      _count: { _all: true },
    });
    attemptCountsByLine = new Map(
      counts
        .filter((row): row is typeof row & { lineId: string } =>
          Boolean(row.lineId),
        )
        .map((row) => [row.lineId, row._count._all]),
    );
  }

  return {
    conversationId: conversation.id,
    title: conversation.title,
    scenarioTitle: conversation.scenario.title,
    childFocus: conversation.childFocus as FamilyChildFocus,
    hasRecall: lines.length > 0,
    lines: lines.map((line) =>
      mapLine(line, attemptCountsByLine.get(line.id) ?? 0),
    ),
  };
}

export async function createFamilyRecallLines(input: {
  userId: string;
  email?: null | string;
  conversationId: string;
  payload: FamilyConversationRecallCreatePayload;
}): Promise<FamilyConversationRecallCreateResponse> {
  const conversation = await loadConversationOrThrow({
    userId: input.userId,
    conversationId: input.conversationId,
  });

  const existingCount = await prisma.familyConversationRecallLine.count({
    where: { conversationId: conversation.id },
  });

  if (existingCount > 0 && !input.payload.regenerate) {
    return {
      created: existingCount,
      conversationId: conversation.id,
      recallUrl: `/family/conversations/${conversation.id}/recall`,
    };
  }

  const profile = await getActiveFamilyProfileForUser({ userId: input.userId });
  const familySummary = profile
    ? buildCompactFamilyProfileSummary(profile.profileMarkdown)
    : "No active family profile is available. Stay warm and generic.";

  let aiAnswer: string;
  try {
    const result = await callAiTutor({
      query: buildFamilyConversationRecallCreatePrompt({
        familySummary,
        scenarioTitle: conversation.scenario.title,
        scenarioCategory: conversation.scenario.category,
        childFocus: conversation.childFocus as "KIWI" | "VIVI" | "BOTH",
        conversationMarkdown: conversation.conversationMarkdown,
      }),
    });
    aiAnswer = result.answer;
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        conversationId: conversation.id,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family conversation recall creation AI call failed",
    );
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Family conversation recall is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  const parsedLines = parseCreateRecallResponse(aiAnswer);

  await prisma.$transaction(async (tx) => {
    if (existingCount > 0) {
      await tx.familyConversationRecallLine.deleteMany({
        where: { conversationId: conversation.id },
      });
    }
    await tx.familyConversationRecallLine.createMany({
      data: parsedLines.map((line, index) => ({
        conversationId: conversation.id,
        orderIndex: index,
        speaker: line.speaker,
        englishText: line.englishText,
        vietnameseText: line.vietnameseText,
        usedChunks: line.usedChunks,
      })),
    });
  });

  logger.info(
    {
      userId: input.userId,
      conversationId: conversation.id,
      created: parsedLines.length,
      regenerated: existingCount > 0,
    },
    "Family conversation recall lines created",
  );

  return {
    created: parsedLines.length,
    conversationId: conversation.id,
    recallUrl: `/family/conversations/${conversation.id}/recall`,
  };
}

export async function compareFamilyRecallAttempt(input: {
  userId: string;
  conversationId: string;
  payload: FamilyConversationRecallComparePayload;
}): Promise<FamilyConversationRecallCompareResponse> {
  const conversation = await loadConversationOrThrow({
    userId: input.userId,
    conversationId: input.conversationId,
  });

  const line = await prisma.familyConversationRecallLine.findFirst({
    where: {
      id: input.payload.lineId,
      conversationId: conversation.id,
    },
  });
  if (!line) {
    throw new NotFoundError("Family recall line was not found.");
  }

  const profile = await getActiveFamilyProfileForUser({ userId: input.userId });
  const familySummary = profile
    ? buildCompactFamilyProfileSummary(profile.profileMarkdown)
    : "No active family profile is available. Stay warm and generic.";

  let aiAnswer: string;
  try {
    const response = await callAiTutor({
      query: buildFamilyConversationRecallComparePrompt({
        familySummary,
        scenarioTitle: conversation.scenario.title,
        childFocus: conversation.childFocus as "KIWI" | "VIVI" | "BOTH",
        speaker: line.speaker,
        vietnameseText: line.vietnameseText,
        originalEnglish: line.englishText,
        userAnswer: input.payload.userAnswer,
      }),
    });
    aiAnswer = response.answer.trim();
  } catch (error) {
    logger.warn(
      {
        userId: input.userId,
        conversationId: conversation.id,
        lineId: line.id,
        error: error instanceof Error ? error.message : "unknown",
      },
      "Family conversation recall compare AI call failed",
    );
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      "Family recall comparison is not available right now.",
      503,
      "AI_TUTOR_UNAVAILABLE",
    );
  }

  if (!aiAnswer) {
    throw new AppError(
      "AI returned an empty family recall comparison.",
      502,
      "AI_TUTOR_INVALID_RESPONSE",
    );
  }

  const score = parseFamilyRecallScore(aiAnswer);
  const missingChunks = parseFamilyRecallMissingChunks(aiAnswer);

  const attempt = await prisma.familyConversationRecallAttempt.create({
    data: {
      userId: input.userId,
      conversationId: conversation.id,
      lineId: line.id,
      mode: "LINE",
      userAnswer: input.payload.userAnswer,
      score: score ?? null,
      feedbackMarkdown: aiAnswer,
    },
  });

  const record: FamilyConversationRecallAttemptRecord = {
    id: attempt.id,
    conversationId: attempt.conversationId,
    lineId: attempt.lineId,
    mode: attempt.mode,
    userAnswer: attempt.userAnswer,
    score: attempt.score,
    feedbackMarkdown: attempt.feedbackMarkdown,
    createdAt: attempt.createdAt.toISOString(),
  };

  return {
    attempt: record,
    originalEnglish: line.englishText,
    missingChunks,
  };
}
