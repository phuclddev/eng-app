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

let buildAiTutorQuery: typeof import("@/server/ai/ai-tutor-prompt-builder").buildAiTutorQuery;
let chatWithAiTutor: typeof import("@/server/ai/ai-tutor-service").chatWithAiTutor;

beforeAll(async () => {
  ({ chatWithAiTutor } = await import("@/server/ai/ai-tutor-service"));
  ({ buildAiTutorQuery } = await import("@/server/ai/ai-tutor-prompt-builder"));
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

  it("builds a structured speaking review prompt when context is provided", () => {
    const query = buildAiTutorQuery({
      message: "Please review my IELTS Speaking answer.",
      purpose: "SPEAKING_COACH",
      context: {
        kind: "SPEAKING_ANSWER_REVIEW",
        speakingPart: "PART_2",
        topic: "Travel",
        subTopic: "Memorable trip",
        prompt: "Describe a memorable trip you enjoyed.",
        recommendedChunks: [
          {
            chunk: "what stands out the most",
            meaningVi: "điều nổi bật nhất",
            usageRole: "MAIN_IDEA",
            exampleSentence: "What stands out the most is how welcoming the locals were.",
          },
        ],
        userAnswer: "I go to Da Nang and it was very beautiful.",
      },
    });

    expect(query).toContain("Speaking part: PART_2");
    expect(query).toContain("Prompt: Describe a memorable trip you enjoyed.");
    expect(query).toContain("Return the response using exactly these section headings in order:");
    expect(query).toContain("1. Overall feedback");
    expect(query).toContain("Learner answer: I go to Da Nang and it was very beautiful.");
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

  it("returns structured feedback when the AI answer follows the required speaking sections", async () => {
    callAiTutor.mockResolvedValue({
      answer: [
        "1. Overall feedback",
        "Good idea development, but some tense control needs work.",
        "2. Grammar fixes",
        "Use past tense consistently: \"I went\" instead of \"I go\".",
        "3. Naturalness",
        "The answer is understandable, but linking feels abrupt.",
        "4. Chunk usage",
        "Use the target chunk after the main idea instead of forcing it at the start.",
        "5. Better version",
        "I went to Da Nang last summer, and what stands out the most is how peaceful the beach was.",
        "6. Suggested chunks",
        "what stands out the most; from my perspective",
        "7. Next practice task",
        "Answer the same prompt again in 3-4 sentences using one comparison.",
      ].join("\n"),
      conversationId: "external-4",
    });
    create.mockResolvedValue({
      id: "internal-4",
    });

    const result = await chatWithAiTutor({
      userId: "user-1",
      message: "Please review my IELTS Speaking answer.",
      purpose: "SPEAKING_COACH",
      context: {
        kind: "SPEAKING_ANSWER_REVIEW",
        speakingPart: "PART_2",
        topic: "Travel",
        prompt: "Describe a memorable trip you enjoyed.",
        recommendedChunks: [],
        userAnswer: "I go to Da Nang and it was very beautiful.",
      },
    });

    expect(result.structuredFeedback).toHaveLength(7);
    expect(result.structuredFeedback?.[0]).toMatchObject({
      key: "overallFeedback",
      title: "Overall feedback",
    });
  });
});
