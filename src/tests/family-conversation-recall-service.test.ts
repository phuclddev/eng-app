import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError } from "@/lib/errors";

const conversationFindFirst = vi.fn();
const lineFindMany = vi.fn();
const lineFindFirst = vi.fn();
const lineCount = vi.fn();
const lineDeleteMany = vi.fn();
const lineCreateMany = vi.fn();
const attemptCreate = vi.fn();
const attemptGroupBy = vi.fn();
const transaction = vi.fn();
const callAiTutor = vi.fn();
const getActiveFamilyProfileForUser = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    familyConversation: { findFirst: conversationFindFirst },
    familyConversationRecallLine: {
      findMany: lineFindMany,
      findFirst: lineFindFirst,
      count: lineCount,
      deleteMany: lineDeleteMany,
      createMany: lineCreateMany,
    },
    familyConversationRecallAttempt: {
      create: attemptCreate,
      groupBy: attemptGroupBy,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

vi.mock("@/server/family/family-profile-service", () => ({
  getActiveFamilyProfileForUser,
}));

let createFamilyRecallLines: typeof import("@/server/family/family-conversation-recall-service").createFamilyRecallLines;
let compareFamilyRecallAttempt: typeof import("@/server/family/family-conversation-recall-service").compareFamilyRecallAttempt;
let getFamilyRecallScript: typeof import("@/server/family/family-conversation-recall-service").getFamilyRecallScript;
let parseFamilyRecallScore: typeof import("@/server/family/family-conversation-recall-service").parseFamilyRecallScore;
let parseFamilyRecallMissingChunks: typeof import("@/server/family/family-conversation-recall-service").parseFamilyRecallMissingChunks;

beforeAll(async () => {
  ({
    createFamilyRecallLines,
    compareFamilyRecallAttempt,
    getFamilyRecallScript,
    parseFamilyRecallScore,
    parseFamilyRecallMissingChunks,
  } = await import(
    "@/server/family/family-conversation-recall-service"
  ));
});

beforeEach(() => {
  conversationFindFirst.mockReset();
  lineFindMany.mockReset();
  lineFindFirst.mockReset();
  lineCount.mockReset();
  lineDeleteMany.mockReset();
  lineCreateMany.mockReset();
  attemptCreate.mockReset();
  attemptGroupBy.mockReset();
  transaction.mockReset();
  callAiTutor.mockReset();
  getActiveFamilyProfileForUser.mockReset();

  transaction.mockImplementation(
    async (
      callback: (tx: {
        familyConversationRecallLine: {
          deleteMany: typeof lineDeleteMany;
          createMany: typeof lineCreateMany;
        };
      }) => Promise<unknown>,
    ) =>
      callback({
        familyConversationRecallLine: {
          deleteMany: lineDeleteMany,
          createMany: lineCreateMany,
        },
      }),
  );
});

const sampleConversation = {
  id: "conv-1",
  userId: "user-1",
  childFocus: "BOTH",
  title: "Bedtime stalling",
  conversationMarkdown:
    "Dad: Time to brush your teeth.\nKiwi: But I'm not sleepy yet.",
  scenario: {
    title: "Bedtime",
    category: "Bedtime",
    childFocus: "BOTH",
  },
};

const validCreateAi = JSON.stringify({
  lines: [
    {
      speaker: "Dad",
      englishText: "Time to brush your teeth.",
      vietnameseText: "Đến giờ đánh răng rồi.",
      usedChunks: ["time to", "brush your teeth"],
    },
    {
      speaker: "Kiwi",
      englishText: "But I'm not sleepy yet.",
      vietnameseText: "Nhưng con vẫn chưa buồn ngủ.",
      usedChunks: ["not sleepy yet"],
    },
  ],
});

const validCompareAi = `# Score
72

# Feedback
Bạn diễn đạt khá ổn nhưng còn cứng.

# Meaning Accuracy
Giữ đúng ý.

# Natural Family English
Nghe hơi sách vở. Có thể tự nhiên hơn.

# Better Version
Time to brush your teeth, sweetie.

# Useful Chunks
- **brush your teeth** = đánh răng (used)
- **come on, sweetie** = nào con (missed)

# Original English
Time to brush your teeth.`;

describe("parseFamilyRecallScore", () => {
  it("extracts the integer score", () => {
    expect(parseFamilyRecallScore("# Score\n81")).toBe(81);
  });
  it("clamps above 100", () => {
    expect(parseFamilyRecallScore("# Score\n130")).toBe(100);
  });
  it("returns null when heading is missing", () => {
    expect(parseFamilyRecallScore("no score here")).toBeNull();
  });
});

describe("parseFamilyRecallMissingChunks", () => {
  it("parses bold-bullet chunks", () => {
    const chunks = parseFamilyRecallMissingChunks(validCompareAi);
    expect(chunks).toEqual([
      { chunk: "brush your teeth", meaningVi: "đánh răng" },
      { chunk: "come on, sweetie", meaningVi: "nào con" },
    ]);
  });
  it("returns empty when (none)", () => {
    expect(
      parseFamilyRecallMissingChunks("# Useful Chunks\n- (none)\n"),
    ).toEqual([]);
  });
});

describe("createFamilyRecallLines", () => {
  it("rejects conversations the user does not own", async () => {
    conversationFindFirst.mockResolvedValueOnce(null);

    await expect(
      createFamilyRecallLines({
        userId: "user-1",
        conversationId: "conv-other",
        payload: { regenerate: false },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("skips AI when recall already exists and regenerate is false", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineCount.mockResolvedValueOnce(4);

    const result = await createFamilyRecallLines({
      userId: "user-1",
      conversationId: "conv-1",
      payload: { regenerate: false },
    });

    expect(result.created).toBe(4);
    expect(callAiTutor).not.toHaveBeenCalled();
    expect(lineDeleteMany).not.toHaveBeenCalled();
  });

  it("calls AI and persists lines on first run", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineCount.mockResolvedValueOnce(0);
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Family profile",
    });
    callAiTutor.mockResolvedValueOnce({
      answer: validCreateAi,
      conversationId: "conv-1",
    });

    const result = await createFamilyRecallLines({
      userId: "user-1",
      conversationId: "conv-1",
      payload: { regenerate: false },
    });

    expect(result.created).toBe(2);
    expect(lineCreateMany).toHaveBeenCalledTimes(1);
    const args = lineCreateMany.mock.calls[0][0] as {
      data: Array<Record<string, unknown>>;
    };
    expect(args.data).toHaveLength(2);
    expect(args.data[0]?.englishText).toBe("Time to brush your teeth.");
    expect(args.data[1]?.vietnameseText).toBe("Nhưng con vẫn chưa buồn ngủ.");
  });

  it("rejects malformed AI JSON", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineCount.mockResolvedValueOnce(0);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockResolvedValueOnce({
      answer: "not json",
      conversationId: "conv-1",
    });

    await expect(
      createFamilyRecallLines({
        userId: "user-1",
        conversationId: "conv-1",
        payload: { regenerate: false },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_INVALID_RESPONSE" });

    expect(lineCreateMany).not.toHaveBeenCalled();
  });

  it("maps AI failure to AI_TUTOR_UNAVAILABLE", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineCount.mockResolvedValueOnce(0);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockRejectedValueOnce(new Error("offline"));

    await expect(
      createFamilyRecallLines({
        userId: "user-1",
        conversationId: "conv-1",
        payload: { regenerate: false },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });

  it("regenerates lines when regenerate is true", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineCount.mockResolvedValueOnce(4);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockResolvedValueOnce({
      answer: validCreateAi,
      conversationId: "conv-1",
    });

    const result = await createFamilyRecallLines({
      userId: "user-1",
      conversationId: "conv-1",
      payload: { regenerate: true },
    });

    expect(result.created).toBe(2);
    expect(lineDeleteMany).toHaveBeenCalledWith({
      where: { conversationId: "conv-1" },
    });
  });

  it("rethrows AppError unchanged", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineCount.mockResolvedValueOnce(0);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      createFamilyRecallLines({
        userId: "user-1",
        conversationId: "conv-1",
        payload: { regenerate: false },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });
});

describe("compareFamilyRecallAttempt", () => {
  const samplePayload = {
    lineId: "line-1",
    userAnswer: "Time to brush.",
  };

  it("rejects conversations the user does not own", async () => {
    conversationFindFirst.mockResolvedValueOnce(null);

    await expect(
      compareFamilyRecallAttempt({
        userId: "user-1",
        conversationId: "conv-other",
        payload: samplePayload,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects lines that do not belong to the conversation", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineFindFirst.mockResolvedValueOnce(null);

    await expect(
      compareFamilyRecallAttempt({
        userId: "user-1",
        conversationId: "conv-1",
        payload: { lineId: "line-bogus", userAnswer: samplePayload.userAnswer },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("persists attempt with parsed score and missing chunks", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineFindFirst.mockResolvedValueOnce({
      id: "line-1",
      speaker: "Dad",
      englishText: "Time to brush your teeth.",
      vietnameseText: "Đến giờ đánh răng rồi.",
    });
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockResolvedValueOnce({
      answer: validCompareAi,
      conversationId: "conv-1",
    });
    attemptCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "attempt-1",
      userId: data.userId,
      conversationId: data.conversationId,
      lineId: data.lineId,
      mode: data.mode,
      userAnswer: data.userAnswer,
      score: data.score,
      feedbackMarkdown: data.feedbackMarkdown,
      createdAt: new Date("2026-06-11T12:00:00.000Z"),
    }));

    const result = await compareFamilyRecallAttempt({
      userId: "user-1",
      conversationId: "conv-1",
      payload: samplePayload,
    });

    expect(result.attempt.score).toBe(72);
    expect(result.missingChunks).toHaveLength(2);
    expect(result.originalEnglish).toBe("Time to brush your teeth.");
  });

  it("returns null score when AI omits the score heading", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineFindFirst.mockResolvedValueOnce({
      id: "line-1",
      speaker: "Dad",
      englishText: "Time to brush your teeth.",
      vietnameseText: "Đến giờ đánh răng rồi.",
    });
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockResolvedValueOnce({
      answer: "# Feedback\nKhông có điểm.",
      conversationId: "conv-1",
    });
    attemptCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "attempt-2",
      userId: data.userId,
      conversationId: data.conversationId,
      lineId: data.lineId,
      mode: data.mode,
      userAnswer: data.userAnswer,
      score: data.score,
      feedbackMarkdown: data.feedbackMarkdown,
      createdAt: new Date(),
    }));

    const result = await compareFamilyRecallAttempt({
      userId: "user-1",
      conversationId: "conv-1",
      payload: samplePayload,
    });

    expect(result.attempt.score).toBeNull();
    expect(result.missingChunks).toEqual([]);
  });

  it("maps upstream failure to AI_TUTOR_UNAVAILABLE", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineFindFirst.mockResolvedValueOnce({
      id: "line-1",
      speaker: "Dad",
      englishText: "Time to brush your teeth.",
      vietnameseText: "Đến giờ đánh răng rồi.",
    });
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockRejectedValueOnce(new Error("offline"));

    await expect(
      compareFamilyRecallAttempt({
        userId: "user-1",
        conversationId: "conv-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });
});

describe("getFamilyRecallScript", () => {
  it("rejects conversations the user does not own", async () => {
    conversationFindFirst.mockResolvedValueOnce(null);

    await expect(
      getFamilyRecallScript({
        userId: "user-1",
        conversationId: "conv-other",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("returns an empty hasRecall=false script when no lines exist", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineFindMany.mockResolvedValueOnce([]);

    const result = await getFamilyRecallScript({
      userId: "user-1",
      conversationId: "conv-1",
    });

    expect(result.hasRecall).toBe(false);
    expect(result.lines).toEqual([]);
    expect(attemptGroupBy).not.toHaveBeenCalled();
  });

  it("attaches latest attempt and attempt count per line", async () => {
    conversationFindFirst.mockResolvedValueOnce(sampleConversation);
    lineFindMany.mockResolvedValueOnce([
      {
        id: "line-1",
        conversationId: "conv-1",
        orderIndex: 0,
        speaker: "Dad",
        englishText: "Time to brush your teeth.",
        vietnameseText: "Đến giờ đánh răng rồi.",
        usedChunks: ["brush your teeth"],
        attempts: [
          {
            id: "attempt-1",
            conversationId: "conv-1",
            lineId: "line-1",
            mode: "LINE",
            userAnswer: "Time to brush.",
            score: 70,
            feedbackMarkdown: "# Score\n70",
            createdAt: new Date("2026-06-11T12:00:00.000Z"),
          },
        ],
      },
    ]);
    attemptGroupBy.mockResolvedValueOnce([
      { lineId: "line-1", _count: { _all: 3 } },
    ]);

    const result = await getFamilyRecallScript({
      userId: "user-1",
      conversationId: "conv-1",
    });

    expect(result.hasRecall).toBe(true);
    expect(result.lines[0].latestAttempt?.score).toBe(70);
    expect(result.lines[0].attemptCount).toBe(3);
    expect(result.lines[0].usedChunks).toEqual(["brush your teeth"]);
  });
});
