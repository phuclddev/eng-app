import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const create = vi.fn();
const update = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    aiConversation: {
      findFirst,
      create,
      update,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let buildAiTutorQuery: typeof import("@/server/ai/ai-tutor-service").buildAiTutorQuery;
let chatWithAiTutor: typeof import("@/server/ai/ai-tutor-service").chatWithAiTutor;

beforeAll(async () => {
  ({ buildAiTutorQuery, chatWithAiTutor } = await import("@/server/ai/ai-tutor-service"));
});

describe("AI tutor service", () => {
  beforeEach(() => {
    findFirst.mockReset();
    create.mockReset();
    update.mockReset();
    callAiTutor.mockReset();
  });

  it("wraps messages with IELTS Speaking tutoring context", () => {
    const query = buildAiTutorQuery({
      message: "Please help me improve this answer.",
      purpose: "SPEAKING_COACH",
    });

    expect(query).toContain("IELTS Speaking chunk training app");
    expect(query).toContain("Please help me improve this answer.");
    expect(query).toContain("Explain in Vietnamese when useful");
  });

  it("creates a new owned conversation for the first successful AI exchange", async () => {
    callAiTutor.mockResolvedValue({
      answer: "Try a more natural transition here.",
      conversationId: "external-1",
    });
    create.mockResolvedValue({
      id: "internal-1",
    });

    const result = await chatWithAiTutor({
      userId: "user-1",
      message: "Please correct this sentence.",
      purpose: "SENTENCE_CORRECTION",
    });

    expect(callAiTutor).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: undefined,
      }),
    );
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        externalConversationId: "external-1",
        purpose: "SENTENCE_CORRECTION",
        title: "Please correct this sentence.",
      },
    });
    expect(result).toEqual({
      answer: "Try a more natural transition here.",
      conversationId: "internal-1",
    });
  });

  it("rejects conversation ids that do not belong to the user", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      chatWithAiTutor({
        userId: "user-1",
        message: "Please continue the chat.",
        conversationId: "internal-2",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("reuses the owned upstream conversation id safely", async () => {
    findFirst.mockResolvedValue({
      id: "internal-3",
      userId: "user-1",
      externalConversationId: "external-3",
      purpose: "GENERAL_CHAT",
      title: "Existing title",
    });
    callAiTutor.mockResolvedValue({
      answer: "Here is the follow-up.",
      conversationId: "external-3",
    });

    const result = await chatWithAiTutor({
      userId: "user-1",
      message: "Continue helping me.",
      conversationId: "internal-3",
      purpose: "GENERAL_CHAT",
    });

    expect(callAiTutor).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "external-3",
      }),
    );
    expect(update).toHaveBeenCalledWith({
      where: {
        id: "internal-3",
      },
      data: {
        externalConversationId: "external-3",
        title: "Existing title",
      },
    });
    expect(result.conversationId).toBe("internal-3");
  });
});
