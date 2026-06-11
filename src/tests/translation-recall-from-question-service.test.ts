import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError } from "@/lib/errors";
import { TRANSLATION_FROM_QUESTION_MAX_CHUNKS } from "@/lib/constants";

const ieltsQuestionFindUnique = vi.fn();
const chunkFindMany = vi.fn();
const scriptFindFirst = vi.fn();
const scriptCreate = vi.fn();
const sentenceCreateMany = vi.fn();
const transaction = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    ieltsQuestion: { findUnique: ieltsQuestionFindUnique },
    chunk: { findMany: chunkFindMany },
    translationScript: {
      findFirst: scriptFindFirst,
      create: scriptCreate,
    },
    translationSentence: { createMany: sentenceCreateMany },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let generateTranslationRecallFromQuestion: typeof import("@/server/translation/translation-recall-from-question-service").generateTranslationRecallFromQuestion;

beforeAll(async () => {
  ({ generateTranslationRecallFromQuestion } = await import(
    "@/server/translation/translation-recall-from-question-service"
  ));
});

const baseQuestion = {
  id: "question-1",
  skill: "SPEAKING",
  taskType: "PART_1",
  topic: "Family",
  subTopic: null,
  prompt: "Describe your family.",
  supportingPoints: ["how big", "what they do"],
  difficulty: 2,
  targetBand: 6.5,
  chunkMappings: [
    {
      chunk: {
        id: "chunk-1",
        chunk: "spend quality time together",
        meaningVi: "dành thời gian chất lượng cùng nhau",
        bandLevel: 7,
        example: "We spend quality time together on weekends.",
        topic: { name: "Family" },
        deletedAt: null,
      },
      usageRole: "MAIN_IDEA",
      sortOrder: 0,
    },
  ],
};

beforeEach(() => {
  ieltsQuestionFindUnique.mockReset();
  chunkFindMany.mockReset();
  scriptFindFirst.mockReset();
  scriptCreate.mockReset();
  sentenceCreateMany.mockReset();
  transaction.mockReset();
  callAiTutor.mockReset();

  transaction.mockImplementation(
    async (
      callback: (tx: {
        translationScript: { create: typeof scriptCreate };
        translationSentence: { createMany: typeof sentenceCreateMany };
      }) => Promise<unknown>,
    ) =>
      callback({
        translationScript: { create: scriptCreate },
        translationSentence: { createMany: sentenceCreateMany },
      }),
  );
});

describe("generateTranslationRecallFromQuestion", () => {
  it("rejects unknown speaking question ids", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(null);

    await expect(
      generateTranslationRecallFromQuestion({
        userId: "user-1",
        payload: {
          speakingQuestionId: "missing",
          length: "MEDIUM",
          includeChunkLibrary: true,
          regenerate: false,
          maxChunks: TRANSLATION_FROM_QUESTION_MAX_CHUNKS,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("returns the existing script when one exists and regenerate is false", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(baseQuestion);
    scriptFindFirst.mockResolvedValueOnce({
      id: "script-existing",
      title: "Family Daily Routine",
      topic: "Family",
      bandLevel: 6.5,
      version: 1,
      usedChunkIds: ["chunk-1"],
      _count: { sentences: 5 },
    });
    chunkFindMany.mockResolvedValueOnce([
      {
        id: "chunk-1",
        chunk: "spend quality time together",
        meaningVi: "dành thời gian chất lượng cùng nhau",
        bandLevel: 7,
        topic: { name: "Family" },
      },
    ]);

    const result = await generateTranslationRecallFromQuestion({
      userId: "user-1",
      payload: {
        speakingQuestionId: "question-1",
        length: "MEDIUM",
        includeChunkLibrary: true,
        regenerate: false,
        maxChunks: 30,
      },
    });

    expect(result.duplicate).toBe(true);
    expect(result.script.id).toBe("script-existing");
    expect(callAiTutor).not.toHaveBeenCalled();
    expect(scriptCreate).not.toHaveBeenCalled();
    expect(result.usedChunks[0].id).toBe("chunk-1");
  });

  it("caps the chunk shortlist at the hard maximum", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(baseQuestion);
    scriptFindFirst.mockResolvedValueOnce(null);

    const manyChunks = Array.from({ length: 80 }, (_, index) => ({
      id: `topic-${index}`,
      chunk: `topic chunk ${index}`,
      meaningVi: `meaning ${index}`,
      bandLevel: 6,
      example: "Example.",
      topic: { name: "Family" },
    }));
    chunkFindMany.mockResolvedValueOnce(manyChunks);
    chunkFindMany.mockResolvedValueOnce([]);

    callAiTutor.mockImplementationOnce(async ({ query }: { query: string }) => {
      const chunkLines = query
        .split("\n")
        .filter((line) => line.startsWith("- ") && line.includes("="));
      expect(chunkLines.length).toBeLessThanOrEqual(
        TRANSLATION_FROM_QUESTION_MAX_CHUNKS,
      );
      return {
        answer: JSON.stringify({
          title: "Family",
          englishAnswer:
            "We **spend quality time together** every Sunday at the park.",
          vietnameseTranslation:
            "Chúng tôi dành thời gian chất lượng cùng nhau mỗi Chủ nhật ở công viên.",
          sentences: [
            {
              english:
                "We **spend quality time together** every Sunday at the park.",
              vietnamese:
                "Chúng tôi dành thời gian chất lượng cùng nhau mỗi Chủ nhật ở công viên.",
            },
          ],
          usedChunks: ["spend quality time together"],
        }),
        conversationId: "conv-1",
      };
    });

    scriptCreate.mockResolvedValueOnce({
      id: "script-new",
      title: "Family · PART_1 · Describe your family.",
      topic: "Family",
      bandLevel: 6.5,
      version: 1,
    });

    await generateTranslationRecallFromQuestion({
      userId: "user-1",
      payload: {
        speakingQuestionId: "question-1",
        length: "MEDIUM",
        includeChunkLibrary: true,
        regenerate: false,
        maxChunks: TRANSLATION_FROM_QUESTION_MAX_CHUNKS,
      },
    });

    expect(scriptCreate).toHaveBeenCalledTimes(1);
    expect(sentenceCreateMany).toHaveBeenCalledTimes(1);
  });

  it("falls back to plain text sentence splitting when AI returns no aligned sentences", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(baseQuestion);
    scriptFindFirst.mockResolvedValueOnce(null);
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: JSON.stringify({
        title: "Fallback",
        englishAnswer:
          "I have a small family. We live in Hanoi. We are very close.",
        vietnameseTranslation:
          "Tôi có một gia đình nhỏ. Chúng tôi sống ở Hà Nội. Chúng tôi rất gần gũi.",
        sentences: [],
        usedChunks: [],
      }),
      conversationId: "conv-1",
    });

    scriptCreate.mockResolvedValueOnce({
      id: "script-fallback",
      title: "Family · PART_1",
      topic: "Family",
      bandLevel: 6.5,
      version: 1,
    });

    const result = await generateTranslationRecallFromQuestion({
      userId: "user-1",
      payload: {
        speakingQuestionId: "question-1",
        length: "MEDIUM",
        includeChunkLibrary: false,
        regenerate: false,
        maxChunks: 30,
      },
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.script.sentenceCount).toBeGreaterThan(1);
  });

  it("falls back when AI returns non-JSON text", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(baseQuestion);
    scriptFindFirst.mockResolvedValueOnce(null);
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer:
        "I have a small family. We live in Hanoi. We are very close.",
      conversationId: "conv-1",
    });
    scriptCreate.mockResolvedValueOnce({
      id: "script-non-json",
      title: "Family · PART_1",
      topic: "Family",
      bandLevel: 6.5,
      version: 1,
    });

    const result = await generateTranslationRecallFromQuestion({
      userId: "user-1",
      payload: {
        speakingQuestionId: "question-1",
        length: "MEDIUM",
        includeChunkLibrary: false,
        regenerate: false,
        maxChunks: 30,
      },
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.warnings.some((message) => message.includes("plain text"))).toBe(
      true,
    );
  });

  it("returns AI_TUTOR_UNAVAILABLE when AI fails", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(baseQuestion);
    scriptFindFirst.mockResolvedValueOnce(null);
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(new Error("upstream offline"));

    await expect(
      generateTranslationRecallFromQuestion({
        userId: "user-1",
        payload: {
          speakingQuestionId: "question-1",
          length: "MEDIUM",
          includeChunkLibrary: false,
          regenerate: false,
          maxChunks: 30,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });

  it("creates a new version when regenerate is true even if an existing script is found", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(baseQuestion);
    scriptFindFirst.mockResolvedValueOnce({
      id: "script-existing",
      title: "Family v1",
      topic: "Family",
      bandLevel: 6.5,
      version: 1,
      usedChunkIds: [],
      _count: { sentences: 4 },
    });
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: JSON.stringify({
        title: "Family v2",
        englishAnswer: "We **spend quality time together** every weekend.",
        vietnameseTranslation:
          "Chúng tôi dành thời gian chất lượng cùng nhau mỗi cuối tuần.",
        sentences: [
          {
            english: "We **spend quality time together** every weekend.",
            vietnamese:
              "Chúng tôi dành thời gian chất lượng cùng nhau mỗi cuối tuần.",
          },
        ],
        usedChunks: ["spend quality time together"],
      }),
      conversationId: "conv-2",
    });

    scriptCreate.mockResolvedValueOnce({
      id: "script-v2",
      title: "Family v2 (v2)",
      topic: "Family",
      bandLevel: 6.5,
      version: 2,
    });

    const result = await generateTranslationRecallFromQuestion({
      userId: "user-1",
      payload: {
        speakingQuestionId: "question-1",
        length: "MEDIUM",
        includeChunkLibrary: true,
        regenerate: true,
        maxChunks: 30,
      },
    });

    expect(result.duplicate).toBe(false);
    expect(result.script.version).toBe(2);
  });

  it("rethrows AppError without wrapping", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(baseQuestion);
    scriptFindFirst.mockResolvedValueOnce(null);
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      generateTranslationRecallFromQuestion({
        userId: "user-1",
        payload: {
          speakingQuestionId: "question-1",
          length: "MEDIUM",
          includeChunkLibrary: false,
          regenerate: false,
          maxChunks: 30,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });
});
