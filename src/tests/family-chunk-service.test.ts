import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "@/lib/errors";
import { familyChunkFormSchema } from "@/lib/validation";

const familyChunkCount = vi.fn();
const familyChunkCreate = vi.fn();
const familyChunkFindFirst = vi.fn();
const familyChunkFindMany = vi.fn();
const familyChunkUpdate = vi.fn();
const familyChunkUpdateMany = vi.fn();
const familyConversationFindFirst = vi.fn();
const transaction = vi.fn();
const callAiTutor = vi.fn();
const getActiveFamilyProfileForUser = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    familyChunk: {
      count: familyChunkCount,
      create: familyChunkCreate,
      findFirst: familyChunkFindFirst,
      findMany: familyChunkFindMany,
      update: familyChunkUpdate,
      updateMany: familyChunkUpdateMany,
    },
    familyConversation: {
      findFirst: familyConversationFindFirst,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

vi.mock("@/server/family/family-profile-service", () => ({
  getActiveFamilyProfileForUser,
}));

let bulkSetFamilyChunkStatus: typeof import("@/server/family/family-chunk-service").bulkSetFamilyChunkStatus;
let extractFamilyChunksFromConversation: typeof import("@/server/family/family-chunk-service").extractFamilyChunksFromConversation;
let saveFamilyChunk: typeof import("@/server/family/family-chunk-service").saveFamilyChunk;
let setFamilyChunkStatus: typeof import("@/server/family/family-chunk-service").setFamilyChunkStatus;

beforeAll(async () => {
  ({
    bulkSetFamilyChunkStatus,
    extractFamilyChunksFromConversation,
    saveFamilyChunk,
    setFamilyChunkStatus,
  } = await import("@/server/family/family-chunk-service"));
});

describe("family chunk service", () => {
  beforeEach(() => {
    familyChunkCount.mockReset();
    familyChunkCreate.mockReset();
    familyChunkFindFirst.mockReset();
    familyChunkFindMany.mockReset();
    familyChunkUpdate.mockReset();
    familyChunkUpdateMany.mockReset();
    familyConversationFindFirst.mockReset();
    transaction.mockReset();
    callAiTutor.mockReset();
    getActiveFamilyProfileForUser.mockReset();
    transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    );
  });

  it("validates family chunk edits before saving", () => {
    expect(() =>
      familyChunkFormSchema.parse({
        text: "",
        meaningVi: "",
        usageContext: "bad",
        speakerRole: "GENERAL",
        childFocus: "GENERAL",
        scenarioCategory: "",
        difficulty: 8,
        frequencyScore: 0,
        personalizationScore: 0,
        status: "SUGGESTED",
      }),
    ).toThrow();
  });

  it("blocks duplicate manual chunks even when the duplicate is archived", async () => {
    familyChunkFindFirst.mockResolvedValueOnce({
      id: "chunk-archived",
      status: "ARCHIVED",
    });

    await expect(
      saveFamilyChunk({
        userId: "user-1",
        values: {
          text: "Just calm down for a second",
          meaningVi: "Bình tĩnh lại một chút",
          usageContext: "Use this when the kids are getting too worked up.",
          speakerRole: "FATHER",
          childFocus: "BOTH",
          scenarioCategory: "Conflict",
          difficulty: 2,
          frequencyScore: 4,
          personalizationScore: 4,
          exampleSentence: "Just calm down for a second and listen to me.",
          notes: null,
          sourceConversationId: null,
          status: "SUGGESTED",
        },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("protects conversation ownership before extraction", async () => {
    familyConversationFindFirst.mockResolvedValue(null);

    await expect(
      extractFamilyChunksFromConversation({
        userId: "user-1",
        conversationId: "conversation-1",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });

    expect(callAiTutor).not.toHaveBeenCalled();
    expect(familyChunkCreate).not.toHaveBeenCalled();
  });

  it("fails cleanly when AI returns invalid JSON", async () => {
    familyConversationFindFirst.mockResolvedValue({
      id: "conversation-1",
      userId: "user-1",
      childFocus: "BOTH",
      conversationMarkdown: "# Conversation\nDad: No phone right now.",
      scenario: {
        id: "scenario-1",
        title: "Asking for phone",
        category: "Conflict",
        description: "Kiwi keeps asking for a phone in the car.",
      },
    });
    getActiveFamilyProfileForUser.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      title: "Phuc Family",
      profileMarkdown: "Kiwi asks for a phone in the car.",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    callAiTutor.mockResolvedValue({
      answer: "not valid json",
      conversationId: "ai-1",
    });

    await expect(
      extractFamilyChunksFromConversation({
        userId: "user-1",
        conversationId: "conversation-1",
      }),
    ).rejects.toMatchObject({
      code: "AI_TUTOR_INVALID_RESPONSE",
      statusCode: 502,
    });

    expect(familyChunkCreate).not.toHaveBeenCalled();
  });

  it("creates suggested chunks and skips duplicates safely", async () => {
    familyConversationFindFirst.mockResolvedValue({
      id: "conversation-1",
      userId: "user-1",
      childFocus: "BOTH",
      conversationMarkdown:
        "# Conversation\nDad: Let's keep moving.\nKiwi: Just five more minutes!",
      scenario: {
        id: "scenario-1",
        title: "Morning routine",
        category: "Routine",
        description: "The kids are slow in the morning.",
      },
    });
    getActiveFamilyProfileForUser.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      title: "Phuc Family",
      profileMarkdown: "Morning routine is often rushed.",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    callAiTutor.mockResolvedValue({
      answer: JSON.stringify({
        chunks: [
          {
            text: "Let's keep moving",
            meaningVi: "Mình đi tiếp thôi",
            usageContext: "Use it to keep the routine moving.",
            speakerRole: "FATHER",
            childFocus: "BOTH",
            scenarioCategory: "Routine",
            difficulty: 1,
            frequencyScore: 5,
            personalizationScore: 4,
            exampleSentence: "Let's keep moving or we'll be late.",
            notes: "Warm but firm.",
          },
          {
            text: "Let's keep moving",
            meaningVi: "Mình đi tiếp thôi",
            usageContext: "Duplicate in the same extraction.",
            speakerRole: "FATHER",
            childFocus: "BOTH",
            scenarioCategory: "Routine",
            difficulty: 1,
            frequencyScore: 5,
            personalizationScore: 4,
            exampleSentence: "Let's keep moving.",
            notes: "Duplicate",
          },
          {
            text: "Just five more minutes",
            meaningVi: "Chỉ thêm năm phút nữa thôi",
            usageContext: "A child asking for more time.",
            speakerRole: "CHILD",
            childFocus: "BOTH",
            scenarioCategory: "Routine",
            difficulty: 1,
            frequencyScore: 5,
            personalizationScore: 5,
            exampleSentence: "Just five more minutes, Dad.",
            notes: "Common delaying phrase.",
          },
        ],
      }),
      conversationId: "ai-1",
    });
    familyChunkFindMany.mockResolvedValueOnce([
      {
        normalizedText: "just five more minutes",
      },
    ]);
    familyChunkCreate.mockResolvedValue({
      id: "chunk-1",
      userId: "user-1",
      text: "Let's keep moving",
      normalizedText: "let s keep moving",
      meaningVi: "Mình đi tiếp thôi",
      usageContext: "Use it to keep the routine moving.",
      speakerRole: "FATHER",
      childFocus: "BOTH",
      scenarioCategory: "Routine",
      difficulty: 1,
      frequencyScore: 5,
      personalizationScore: 4,
      exampleSentence: "Let's keep moving or we'll be late.",
      notes: "Warm but firm.",
      sourceConversationId: "conversation-1",
      status: "SUGGESTED",
      createdAt: new Date("2026-06-09T08:00:00.000Z"),
      updatedAt: new Date("2026-06-09T08:00:00.000Z"),
    });

    const result = await extractFamilyChunksFromConversation({
      userId: "user-1",
      conversationId: "conversation-1",
    });

    expect(result.summary).toEqual({
      created: 1,
      skippedDuplicates: 2,
      errors: [],
    });
    expect(familyChunkCreate).toHaveBeenCalledTimes(1);
    expect(familyChunkCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        text: "Let's keep moving",
        sourceConversationId: "conversation-1",
        status: "SUGGESTED",
      }),
    });
  });

  it("supports approve and archive transitions for owned chunks", async () => {
    familyChunkFindFirst.mockResolvedValueOnce({
      id: "chunk-1",
      userId: "user-1",
      status: "SUGGESTED",
    });
    familyChunkUpdate.mockResolvedValueOnce({
      id: "chunk-1",
      userId: "user-1",
      text: "Let's keep moving",
      meaningVi: "Mình đi tiếp thôi",
      usageContext: "Use it to keep the routine moving.",
      speakerRole: "FATHER",
      childFocus: "BOTH",
      scenarioCategory: "Routine",
      difficulty: 1,
      frequencyScore: 5,
      personalizationScore: 4,
      exampleSentence: "Let's keep moving or we'll be late.",
      notes: "Warm but firm.",
      sourceConversationId: "conversation-1",
      status: "APPROVED",
      createdAt: new Date("2026-06-09T08:00:00.000Z"),
      updatedAt: new Date("2026-06-09T09:00:00.000Z"),
    });

    const approved = await setFamilyChunkStatus({
      userId: "user-1",
      chunkId: "chunk-1",
      status: "APPROVED",
    });

    expect(approved.status).toBe("APPROVED");
    expect(familyChunkUpdate).toHaveBeenCalledWith({
      where: {
        id: "chunk-1",
      },
      data: {
        status: "APPROVED",
      },
    });
  });

  it("updates many selected chunks in a bulk transition", async () => {
    familyChunkFindMany
      .mockResolvedValueOnce([{ id: "chunk-1" }, { id: "chunk-2" }])
      .mockResolvedValueOnce([
        {
          id: "chunk-1",
          userId: "user-1",
          text: "Let's keep moving",
          meaningVi: "Mình đi tiếp thôi",
          usageContext: "Use it to keep the routine moving.",
          speakerRole: "FATHER",
          childFocus: "BOTH",
          scenarioCategory: "Routine",
          difficulty: 1,
          frequencyScore: 5,
          personalizationScore: 4,
          exampleSentence: "Let's keep moving or we'll be late.",
          notes: "Warm but firm.",
          sourceConversationId: "conversation-1",
          status: "ARCHIVED",
          createdAt: new Date("2026-06-09T08:00:00.000Z"),
          updatedAt: new Date("2026-06-09T09:00:00.000Z"),
        },
        {
          id: "chunk-2",
          userId: "user-1",
          text: "Take a deep breath",
          meaningVi: "Hít thở sâu nào",
          usageContext: "Use it to calm a child down.",
          speakerRole: "FATHER",
          childFocus: "BOTH",
          scenarioCategory: "Conflict",
          difficulty: 2,
          frequencyScore: 4,
          personalizationScore: 5,
          exampleSentence: "Take a deep breath and tell me what happened.",
          notes: null,
          sourceConversationId: null,
          status: "ARCHIVED",
          createdAt: new Date("2026-06-09T08:30:00.000Z"),
          updatedAt: new Date("2026-06-09T09:10:00.000Z"),
        },
      ]);
    familyChunkUpdateMany.mockResolvedValue({
      count: 2,
    });

    const result = await bulkSetFamilyChunkStatus({
      userId: "user-1",
      chunkIds: ["chunk-1", "chunk-2"],
      status: "ARCHIVED",
    });

    expect(familyChunkUpdateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ["chunk-1", "chunk-2"],
        },
        userId: "user-1",
      },
      data: {
        status: "ARCHIVED",
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.status).toBe("ARCHIVED");
  });
});
