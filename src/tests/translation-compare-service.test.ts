import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError } from "@/lib/errors";

const scriptFindUnique = vi.fn();
const attemptCreate = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    translationScript: { findUnique: scriptFindUnique },
    translationRecallAttempt: { create: attemptCreate },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let compareTranslationRecallAttempt: typeof import("@/server/translation/translation-compare-service").compareTranslationRecallAttempt;
let parseTranslationCompareScore: typeof import("@/server/translation/translation-compare-service").parseTranslationCompareScore;
let parseTranslationCompareMissingChunks: typeof import("@/server/translation/translation-compare-service").parseTranslationCompareMissingChunks;

beforeAll(async () => {
  ({
    compareTranslationRecallAttempt,
    parseTranslationCompareScore,
    parseTranslationCompareMissingChunks,
  } = await import("@/server/translation/translation-compare-service"));
});

beforeEach(() => {
  scriptFindUnique.mockReset();
  attemptCreate.mockReset();
  callAiTutor.mockReset();
});

const sampleScript = {
  id: "script-1",
  title: "Daily Routine",
  topic: "Daily Life",
  bandLevel: 6,
  sentences: [
    {
      id: "sentence-1",
      orderIndex: 0,
      englishText: "I usually wake up at six.",
      vietnameseText: "Tôi thường thức dậy lúc 6 giờ.",
    },
    {
      id: "sentence-2",
      orderIndex: 1,
      englishText: "I have a cup of coffee.",
      vietnameseText: "Tôi uống một tách cà phê.",
    },
  ],
};

const validMarkdown = `# Score
78

# Overall Feedback
Bạn diễn đạt khá ổn nhưng còn thiếu một chunk hay.

# Meaning Accuracy
Giữ đúng nghĩa nhưng thiếu chi tiết về buổi sáng.

# Grammar & Naturalness
Ngữ pháp ổn.

# Missing Chunks
- **wake up at six** = thức dậy lúc 6 giờ
- **a cup of coffee** = một tách cà phê

# Better Version
I usually wake up at six and have a cup of coffee.

# Original Answer
I usually wake up at six.`;

describe("parseTranslationCompareScore", () => {
  it("extracts a score 0-100", () => {
    expect(parseTranslationCompareScore("# Score\n82\n# Overall")).toBe(82);
  });

  it("clamps scores above 100", () => {
    expect(parseTranslationCompareScore("# Score\n130\n")).toBe(100);
  });

  it("returns null when the heading is missing", () => {
    expect(parseTranslationCompareScore("no headings here")).toBeNull();
  });
});

describe("parseTranslationCompareMissingChunks", () => {
  it("parses bold chunk + Vietnamese meaning pairs", () => {
    const chunks = parseTranslationCompareMissingChunks(validMarkdown);
    expect(chunks).toEqual([
      { chunk: "wake up at six", meaningVi: "thức dậy lúc 6 giờ" },
      { chunk: "a cup of coffee", meaningVi: "một tách cà phê" },
    ]);
  });

  it("returns empty when AI says (none)", () => {
    const markdown = "# Missing Chunks\n- (none)\n\n# Better Version\n...";
    expect(parseTranslationCompareMissingChunks(markdown)).toEqual([]);
  });

  it("returns empty when section is missing", () => {
    expect(parseTranslationCompareMissingChunks("nothing")).toEqual([]);
  });
});

describe("compareTranslationRecallAttempt", () => {
  const samplePayload = {
    scriptId: "script-1",
    sentenceId: "sentence-1",
    mode: "SENTENCE" as const,
    userAnswer: "I wake up at six.",
  };

  it("rejects unknown scripts", async () => {
    scriptFindUnique.mockResolvedValueOnce(null);

    await expect(
      compareTranslationRecallAttempt({
        userId: "user-1",
        payload: samplePayload,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("rejects unknown sentences in SENTENCE mode", async () => {
    scriptFindUnique.mockResolvedValueOnce(sampleScript);

    await expect(
      compareTranslationRecallAttempt({
        userId: "user-1",
        payload: { ...samplePayload, sentenceId: "missing" },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("maps upstream failure to AI_TUTOR_UNAVAILABLE", async () => {
    scriptFindUnique.mockResolvedValueOnce(sampleScript);
    callAiTutor.mockRejectedValueOnce(new Error("offline"));

    await expect(
      compareTranslationRecallAttempt({
        userId: "user-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });

  it("rethrows AppError without wrapping", async () => {
    scriptFindUnique.mockResolvedValueOnce(sampleScript);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      compareTranslationRecallAttempt({
        userId: "user-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });

  it("persists the attempt with the parsed score and returns missing chunks", async () => {
    scriptFindUnique.mockResolvedValueOnce(sampleScript);
    callAiTutor.mockResolvedValueOnce({
      answer: validMarkdown,
      conversationId: "conv-1",
    });
    attemptCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "attempt-1",
      userId: data.userId,
      scriptId: data.scriptId,
      sentenceId: data.sentenceId,
      mode: data.mode,
      userAnswer: data.userAnswer,
      score: data.score,
      feedbackMarkdown: data.feedbackMarkdown,
      createdAt: new Date("2026-06-11T12:00:00.000Z"),
    }));

    const result = await compareTranslationRecallAttempt({
      userId: "user-1",
      payload: samplePayload,
    });

    expect(result.attempt.score).toBe(78);
    expect(result.attempt.id).toBe("attempt-1");
    expect(result.missingChunks).toHaveLength(2);
    expect(result.originalEnglish).toBe("I usually wake up at six.");
    expect(attemptCreate).toHaveBeenCalledTimes(1);
    const createArgs = attemptCreate.mock.calls[0][0] as {
      data: { mode: string; sentenceId: string | null };
    };
    expect(createArgs.data.mode).toBe("SENTENCE");
    expect(createArgs.data.sentenceId).toBe("sentence-1");
  });

  it("uses the full passage for PASSAGE mode and ignores sentence id", async () => {
    scriptFindUnique.mockResolvedValueOnce(sampleScript);
    callAiTutor.mockResolvedValueOnce({
      answer: validMarkdown,
      conversationId: "conv-2",
    });
    attemptCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "attempt-2",
      userId: data.userId,
      scriptId: data.scriptId,
      sentenceId: data.sentenceId,
      mode: data.mode,
      userAnswer: data.userAnswer,
      score: data.score,
      feedbackMarkdown: data.feedbackMarkdown,
      createdAt: new Date("2026-06-11T12:00:00.000Z"),
    }));

    const result = await compareTranslationRecallAttempt({
      userId: "user-1",
      payload: {
        scriptId: "script-1",
        mode: "PASSAGE",
        userAnswer: "I wake up at six. I have a cup of coffee.",
      },
    });

    expect(result.attempt.mode).toBe("PASSAGE");
    expect(result.attempt.sentenceId).toBeNull();
    expect(result.originalEnglish).toContain("I usually wake up at six.");
    expect(result.originalEnglish).toContain("I have a cup of coffee.");
  });

  it("persists score = null when AI markdown has no score heading", async () => {
    scriptFindUnique.mockResolvedValueOnce(sampleScript);
    callAiTutor.mockResolvedValueOnce({
      answer: "# Overall Feedback\nKhông có điểm.",
      conversationId: "conv-3",
    });
    attemptCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "attempt-3",
      userId: data.userId,
      scriptId: data.scriptId,
      sentenceId: data.sentenceId,
      mode: data.mode,
      userAnswer: data.userAnswer,
      score: data.score,
      feedbackMarkdown: data.feedbackMarkdown,
      createdAt: new Date(),
    }));

    const result = await compareTranslationRecallAttempt({
      userId: "user-1",
      payload: samplePayload,
    });

    expect(result.attempt.score).toBeNull();
    expect(result.missingChunks).toEqual([]);
  });
});
