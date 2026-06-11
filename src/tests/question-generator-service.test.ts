import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const ieltsQuestionFindMany = vi.fn();
const ieltsQuestionCreate = vi.fn();
const ieltsQuestionUpdate = vi.fn();
const ieltsQuestionUpdateMany = vi.fn();
const ieltsQuestionFindUnique = vi.fn();
const mappingCreate = vi.fn();
const chunkFindMany = vi.fn();
const transaction = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    ieltsQuestion: {
      findMany: ieltsQuestionFindMany,
      create: ieltsQuestionCreate,
      update: ieltsQuestionUpdate,
      updateMany: ieltsQuestionUpdateMany,
      findUnique: ieltsQuestionFindUnique,
    },
    ieltsQuestionChunkMapping: {
      create: mappingCreate,
    },
    chunk: {
      findMany: chunkFindMany,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let generateIeltsSpeakingQuestions: typeof import("@/server/questions/question-generator-service").generateIeltsSpeakingQuestions;
let setIeltsQuestionStatus: typeof import("@/server/questions/question-generator-service").setIeltsQuestionStatus;
let bulkSetIeltsQuestionStatus: typeof import("@/server/questions/question-generator-service").bulkSetIeltsQuestionStatus;

beforeAll(async () => {
  ({
    generateIeltsSpeakingQuestions,
    setIeltsQuestionStatus,
    bulkSetIeltsQuestionStatus,
  } = await import("@/server/questions/question-generator-service"));
});

beforeEach(() => {
  ieltsQuestionFindMany.mockReset();
  ieltsQuestionCreate.mockReset();
  ieltsQuestionUpdate.mockReset();
  ieltsQuestionUpdateMany.mockReset();
  ieltsQuestionFindUnique.mockReset();
  mappingCreate.mockReset();
  chunkFindMany.mockReset();
  transaction.mockReset();
  callAiTutor.mockReset();

  transaction.mockImplementation(
    async (
      callback: (tx: {
        ieltsQuestion: {
          create: typeof ieltsQuestionCreate;
          findUnique: typeof ieltsQuestionFindUnique;
        };
        ieltsQuestionChunkMapping: { create: typeof mappingCreate };
      }) => Promise<unknown>,
    ) =>
      callback({
        ieltsQuestion: {
          create: ieltsQuestionCreate,
          findUnique: ieltsQuestionFindUnique,
        },
        ieltsQuestionChunkMapping: { create: mappingCreate },
      }),
  );
});

const validAnswer = JSON.stringify({
  questions: [
    {
      part: "PART_1",
      topic: "Hometown",
      subTopic: "Living place",
      prompt: "Do you like the area where you live?",
      bullet_1: "",
      bullet_2: "",
      bullet_3: "",
      bullet_4: "",
      difficulty: 2,
      targetBand: 6.5,
      recommendedChunks: ["to be honest", "what I like most about it is"],
      chunkRoles: ["OPENING", "DETAIL"],
      popularityScore: 5,
      predictedUsefulnessScore: 5,
      aiReason: "Câu hỏi quen thuộc giúp luyện hỏi đáp tự nhiên về quê hương.",
    },
    {
      part: "PART_2",
      topic: "Hometown",
      subTopic: "A favourite place",
      prompt: "Describe a place near your home that you enjoy visiting.",
      bullet_1: "where it is",
      bullet_2: "how often you go there",
      bullet_3: "what you do there",
      bullet_4: "and explain why you enjoy visiting it",
      difficulty: 3,
      targetBand: 7,
      recommendedChunks: ["it's just around the corner"],
      chunkRoles: ["DETAIL"],
      popularityScore: 4,
      predictedUsefulnessScore: 4,
      aiReason: "Cue card chuẩn Part 2 cho chủ đề quê hương.",
    },
  ],
});

const samplePayload = {
  part: "MIXED" as const,
  count: 5,
  targetBand: 6.5,
  includeRecommendedChunks: true,
};

describe("generateIeltsSpeakingQuestions", () => {
  it("rejects malformed AI JSON with AI_TUTOR_INVALID_RESPONSE", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: "not json",
      conversationId: "conv-1",
    });

    await expect(
      generateIeltsSpeakingQuestions({
        actorId: "admin-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_INVALID_RESPONSE" });

    expect(ieltsQuestionCreate).not.toHaveBeenCalled();
  });

  it("maps AI upstream failure to AI_TUTOR_UNAVAILABLE", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(new Error("network down"));

    await expect(
      generateIeltsSpeakingQuestions({
        actorId: "admin-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });

  it("rethrows AppError unchanged", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      generateIeltsSpeakingQuestions({
        actorId: "admin-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });

  it("dedupes against existing normalized prompts", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    ieltsQuestionFindMany.mockResolvedValueOnce([
      {
        skill: "SPEAKING",
        taskType: "PART_1",
        normalizedPrompt: "do you like the area where you live?",
      },
    ]);
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: validAnswer,
      conversationId: "conv-1",
    });

    ieltsQuestionCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `q-${(data.prompt as string).slice(0, 8)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    ieltsQuestionFindUnique.mockImplementation(async () => ({
      id: "q-created",
      skill: "SPEAKING",
      taskType: "PART_2",
      topic: "Hometown",
      subTopic: "A favourite place",
      prompt: "Describe a place near your home that you enjoy visiting.",
      supportingPoints: [],
      difficulty: 3,
      targetBand: 7,
      notes: null,
      status: "SUGGESTED",
      source: "AI_GENERATED",
      aiReason: "...",
      popularityScore: 4,
      predictedUsefulnessScore: 4,
      generatedBatchId: "batch",
      createdAt: new Date(),
      updatedAt: new Date(),
      chunkMappings: [],
    }));

    const summary = await generateIeltsSpeakingQuestions({
      actorId: "admin-1",
      payload: samplePayload,
    });

    expect(summary.skippedDuplicates).toBe(1);
    expect(summary.created).toBe(1);
    expect(ieltsQuestionCreate).toHaveBeenCalledTimes(1);
  });

  it("creates questions and maps recommended chunks that exist in the library", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([
      { id: "chunk-a", chunk: "to be honest" },
      { id: "chunk-b", chunk: "what I like most about it is" },
    ]);
    callAiTutor.mockResolvedValueOnce({
      answer: validAnswer,
      conversationId: "conv-1",
    });

    ieltsQuestionCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `q-${(data.prompt as string).slice(0, 8)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    ieltsQuestionFindUnique.mockImplementation(async () => ({
      id: "q-1",
      skill: "SPEAKING",
      taskType: "PART_1",
      topic: "Hometown",
      subTopic: "Living place",
      prompt: "Do you like the area where you live?",
      supportingPoints: [],
      difficulty: 2,
      targetBand: 6.5,
      notes: null,
      status: "SUGGESTED",
      source: "AI_GENERATED",
      aiReason: "...",
      popularityScore: 5,
      predictedUsefulnessScore: 5,
      generatedBatchId: "batch",
      createdAt: new Date(),
      updatedAt: new Date(),
      chunkMappings: [],
    }));

    const summary = await generateIeltsSpeakingQuestions({
      actorId: "admin-1",
      payload: samplePayload,
    });

    expect(summary.created).toBe(2);
    expect(mappingCreate).toHaveBeenCalled();
  });

  it("respects the part filter when not MIXED", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    ieltsQuestionFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    chunkFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: validAnswer,
      conversationId: "conv-1",
    });

    ieltsQuestionCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `q-${(data.prompt as string).slice(0, 8)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    ieltsQuestionFindUnique.mockImplementation(async () => ({
      id: "q-1",
      skill: "SPEAKING",
      taskType: "PART_1",
      topic: "Hometown",
      subTopic: "Living place",
      prompt: "Do you like the area where you live?",
      supportingPoints: [],
      difficulty: 2,
      targetBand: 6.5,
      notes: null,
      status: "SUGGESTED",
      source: "AI_GENERATED",
      aiReason: "...",
      popularityScore: 5,
      predictedUsefulnessScore: 5,
      generatedBatchId: "batch",
      createdAt: new Date(),
      updatedAt: new Date(),
      chunkMappings: [],
    }));

    const summary = await generateIeltsSpeakingQuestions({
      actorId: "admin-1",
      payload: {
        ...samplePayload,
        part: "PART_1",
      },
    });

    expect(summary.created).toBe(1);
    expect(summary.warnings.some((warn) => warn.includes("dropped"))).toBe(true);
  });
});

describe("status transitions", () => {
  it("rejects unknown questions", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce(null);

    await expect(
      setIeltsQuestionStatus({
        actorId: "admin-1",
        questionId: "missing",
        status: "APPROVED",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("updates status for an existing question", async () => {
    ieltsQuestionFindUnique.mockResolvedValueOnce({ id: "q-1" });
    ieltsQuestionUpdate.mockResolvedValueOnce({
      id: "q-1",
      skill: "SPEAKING",
      taskType: "PART_1",
      topic: "Hometown",
      subTopic: null,
      prompt: "Where do you live?",
      supportingPoints: [],
      difficulty: 2,
      targetBand: 6,
      notes: null,
      status: "APPROVED",
      source: "AI_GENERATED",
      aiReason: null,
      popularityScore: 3,
      predictedUsefulnessScore: 3,
      generatedBatchId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      chunkMappings: [],
    });

    const result = await setIeltsQuestionStatus({
      actorId: "admin-1",
      questionId: "q-1",
      status: "APPROVED",
    });

    expect(result.status).toBe("APPROVED");
  });

  it("bulk update rejects partial ownership match", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([{ id: "q-1" }]);

    await expect(
      bulkSetIeltsQuestionStatus({
        actorId: "admin-1",
        questionIds: ["q-1", "q-missing"],
        status: "APPROVED",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(ieltsQuestionUpdateMany).not.toHaveBeenCalled();
  });

  it("bulk update flips all matched questions", async () => {
    ieltsQuestionFindMany.mockResolvedValueOnce([{ id: "q-1" }, { id: "q-2" }]);
    ieltsQuestionUpdateMany.mockResolvedValueOnce({ count: 2 });
    ieltsQuestionFindMany.mockResolvedValueOnce([
      {
        id: "q-1",
        skill: "SPEAKING",
        taskType: "PART_1",
        topic: "Hometown",
        subTopic: null,
        prompt: "p1",
        supportingPoints: [],
        difficulty: 2,
        targetBand: 6,
        notes: null,
        status: "APPROVED",
        source: "AI_GENERATED",
        aiReason: null,
        popularityScore: 3,
        predictedUsefulnessScore: 3,
        generatedBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        chunkMappings: [],
      },
      {
        id: "q-2",
        skill: "SPEAKING",
        taskType: "PART_1",
        topic: "Hometown",
        subTopic: null,
        prompt: "p2",
        supportingPoints: [],
        difficulty: 2,
        targetBand: 6,
        notes: null,
        status: "APPROVED",
        source: "AI_GENERATED",
        aiReason: null,
        popularityScore: 3,
        predictedUsefulnessScore: 3,
        generatedBatchId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        chunkMappings: [],
      },
    ]);

    const result = await bulkSetIeltsQuestionStatus({
      actorId: "admin-1",
      questionIds: ["q-1", "q-2"],
      status: "APPROVED",
    });

    expect(result).toHaveLength(2);
    expect(ieltsQuestionUpdateMany).toHaveBeenCalledTimes(1);
  });
});
