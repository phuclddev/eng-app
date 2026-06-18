import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const ieltsQuestionFindUnique = vi.fn();
const speakingIdeaFindUnique = vi.fn();
const speakingIdeaQuestionMapFindUnique = vi.fn();
const chunkFindMany = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    ieltsQuestion: {
      findUnique: ieltsQuestionFindUnique,
    },
    speakingIdea: {
      findUnique: speakingIdeaFindUnique,
    },
    speakingIdeaQuestionMap: {
      findUnique: speakingIdeaQuestionMapFindUnique,
    },
    chunk: {
      findMany: chunkFindMany,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let generateSpeakingIdeaAnswer: typeof import("@/server/speaking-ideas/idea-answer-service").generateSpeakingIdeaAnswer;

beforeAll(async () => {
  ({ generateSpeakingIdeaAnswer } = await import("@/server/speaking-ideas/idea-answer-service"));
});

beforeEach(() => {
  ieltsQuestionFindUnique.mockReset();
  speakingIdeaFindUnique.mockReset();
  speakingIdeaQuestionMapFindUnique.mockReset();
  chunkFindMany.mockReset();
  callAiTutor.mockReset();
});

describe("speaking idea answer service", () => {
  it("saves a generated answer with detected used chunks", async () => {
    ieltsQuestionFindUnique.mockResolvedValue({
      id: "question-1",
      taskType: "PART_3",
      topic: "Technology",
      subTopic: "Online shopping",
      prompt: "Why do people shop online?",
      targetBand: 6.5,
      supportingPoints: [],
      chunkMappings: [
        {
          chunkId: "chunk-1",
          usageRole: "REASON",
          sortOrder: 0,
          chunk: {
            id: "chunk-1",
            chunk: "save time",
            meaningVi: "tiet kiem thoi gian",
            bandLevel: 6.5,
            example: "It helps people save time.",
            topic: { name: "Technology" },
          },
        },
      ],
    });
    speakingIdeaFindUnique.mockResolvedValue({
      id: "idea-1",
      title: "Saving time",
      shortLabel: "Time-saving",
      descriptionVi: "Giai thich bang y tiet kiem thoi gian.",
      descriptionEn: "People like choices that save time.",
      variants: [],
      supports: [],
      patterns: [
        {
          id: "pattern-1",
          patternText: "People do X mainly because...",
          exampleAnswer: "People shop online mainly because it is faster.",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });
    speakingIdeaQuestionMapFindUnique.mockResolvedValue({
      aiReason: "The idea matches convenience.",
      relevanceScore: 5,
      isPrimary: true,
    });
    chunkFindMany.mockResolvedValue([]);
    callAiTutor.mockResolvedValue({
      answer: [
        "# Sample Answer",
        "I think many people shop online because it can **save time** and make daily life easier.",
        "",
        "# Idea Used",
        "The core idea is convenience and efficiency.",
        "",
        "# Chunks / Phrases Used",
        "- **save time**",
        "",
        "# Vietnamese Explanation",
        "Y nay co the tai su dung cho cau hoi ve su thuan tien.",
        "",
        "# Reusable Pattern",
        "**People do X mainly because** it saves time.",
      ].join("\n"),
      conversationId: "conv-1",
    });
    const result = await generateSpeakingIdeaAnswer({
      payload: {
        questionId: "question-1",
        ideaId: "idea-1",
        length: "MEDIUM",
        targetBand: 6.5,
      },
    });

    expect(callAiTutor).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining("People do X mainly because"),
      }),
    );
    expect(result.usedChunks).toHaveLength(1);
    expect(result.usedChunks[0]?.chunk).toBe("save time");
  });

  it("falls back to structured markdown when AI returns plain text", async () => {
    ieltsQuestionFindUnique.mockResolvedValue({
      id: "question-1",
      taskType: "PART_1",
      topic: "Hobbies",
      subTopic: null,
      prompt: "Do you enjoy reading?",
      targetBand: 6,
      supportingPoints: [],
      chunkMappings: [],
    });
    speakingIdeaFindUnique.mockResolvedValue({
      id: "idea-1",
      title: "Learning new things",
      shortLabel: "Learning",
      descriptionVi: "Thich hoc hoi dieu moi.",
      descriptionEn: "People enjoy activities that help them learn.",
      variants: [],
      supports: [],
      patterns: [],
    });
    speakingIdeaQuestionMapFindUnique.mockResolvedValue(null);
    chunkFindMany.mockResolvedValue([]);
    callAiTutor.mockResolvedValue({
      answer: "Yes, I do. Reading helps me relax and learn new things after work.",
      conversationId: "conv-2",
    });
    const result = await generateSpeakingIdeaAnswer({
      payload: {
        questionId: "question-1",
        ideaId: "idea-1",
        length: "SHORT",
      },
    });

    expect(result.answer.answerMarkdown).toContain("# Vietnamese Explanation");
    expect(result.answer.length).toBe("SHORT");
  });

  it("rejects missing questions or ideas", async () => {
    ieltsQuestionFindUnique.mockResolvedValue(null);
    speakingIdeaFindUnique.mockResolvedValue({
      id: "idea-1",
      title: "Saving time",
      shortLabel: "Time-saving",
      descriptionVi: "x",
      descriptionEn: "x",
      variants: [],
      supports: [],
      patterns: [],
    });
    speakingIdeaQuestionMapFindUnique.mockResolvedValue(null);

    await expect(
      generateSpeakingIdeaAnswer({
        payload: {
          questionId: "missing",
          ideaId: "idea-1",
          length: "MEDIUM",
        },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
