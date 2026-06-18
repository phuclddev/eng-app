import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const speakingIdeaFindUnique = vi.fn();
const ieltsQuestionFindUnique = vi.fn();
const speakingIdeaQuestionMapFindUnique = vi.fn();
const speakingIdeaQuestionMapCreate = vi.fn();
const speakingIdeaQuestionMapUpdate = vi.fn();
const speakingIdeaQuestionMapDelete = vi.fn();
const speakingIdeaQuestionMapUpdateMany = vi.fn();
const speakingIdeaFindMany = vi.fn();
const ieltsQuestionFindMany = vi.fn();
const transaction = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    speakingIdea: {
      findUnique: speakingIdeaFindUnique,
      findMany: speakingIdeaFindMany,
    },
    ieltsQuestion: {
      findUnique: ieltsQuestionFindUnique,
      findMany: ieltsQuestionFindMany,
    },
    speakingIdeaQuestionMap: {
      findUnique: speakingIdeaQuestionMapFindUnique,
      create: speakingIdeaQuestionMapCreate,
      update: speakingIdeaQuestionMapUpdate,
      delete: speakingIdeaQuestionMapDelete,
      updateMany: speakingIdeaQuestionMapUpdateMany,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let createIdeaQuestionMap: typeof import("@/server/speaking-ideas/question-map-service").createIdeaQuestionMap;
let updateIdeaQuestionMap: typeof import("@/server/speaking-ideas/question-map-service").updateIdeaQuestionMap;
let deleteIdeaQuestionMap: typeof import("@/server/speaking-ideas/question-map-service").deleteIdeaQuestionMap;
let suggestIdeaQuestionMappings: typeof import("@/server/speaking-ideas/question-map-service").suggestIdeaQuestionMappings;
let parseSuggestionAnswer: typeof import("@/server/speaking-ideas/question-map-service").parseSuggestionAnswer;

beforeAll(async () => {
  ({
    createIdeaQuestionMap,
    updateIdeaQuestionMap,
    deleteIdeaQuestionMap,
    suggestIdeaQuestionMappings,
    parseSuggestionAnswer,
  } = await import("@/server/speaking-ideas/question-map-service"));
});

beforeEach(() => {
  speakingIdeaFindUnique.mockReset();
  ieltsQuestionFindUnique.mockReset();
  speakingIdeaQuestionMapFindUnique.mockReset();
  speakingIdeaQuestionMapCreate.mockReset();
  speakingIdeaQuestionMapUpdate.mockReset();
  speakingIdeaQuestionMapDelete.mockReset();
  speakingIdeaQuestionMapUpdateMany.mockReset();
  speakingIdeaFindMany.mockReset();
  ieltsQuestionFindMany.mockReset();
  callAiTutor.mockReset();
  transaction.mockReset();
  transaction.mockImplementation(async (callback) =>
    callback({
      speakingIdeaQuestionMap: {
        create: speakingIdeaQuestionMapCreate,
        update: speakingIdeaQuestionMapUpdate,
        updateMany: speakingIdeaQuestionMapUpdateMany,
      },
    }),
  );
});

describe("question map service", () => {
  it("prevents duplicate manual mappings", async () => {
    speakingIdeaFindUnique.mockResolvedValue({ id: "idea-1" });
    ieltsQuestionFindUnique.mockResolvedValue({ id: "question-1" });
    speakingIdeaQuestionMapFindUnique.mockResolvedValue({ id: "map-1" });

    await expect(
      createIdeaQuestionMap({
        ideaId: "idea-1",
        questionId: "question-1",
        relevanceScore: 4,
        isPrimary: false,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("demotes previous primary mapping when a new primary is created", async () => {
    speakingIdeaFindUnique.mockResolvedValue({ id: "idea-1" });
    ieltsQuestionFindUnique.mockResolvedValue({ id: "question-1" });
    speakingIdeaQuestionMapFindUnique.mockResolvedValue(null);
    speakingIdeaQuestionMapCreate.mockResolvedValue({
      id: "map-2",
      relevanceScore: 5,
      isPrimary: true,
      aiReason: "Fits well",
      createdAt: new Date(),
      updatedAt: new Date(),
      idea: {
        id: "idea-1",
        title: "Saving time",
        shortLabel: "Time-saving",
        status: "ACTIVE",
        reuseScore: 5,
        popularityScore: 5,
      },
      speakingQuestion: {
        id: "question-1",
        taskType: "PART_1",
        topic: "Daily routine",
        subTopic: null,
        prompt: "How do you save time?",
        targetBand: 6.5,
        status: "APPROVED",
      },
    });

    const result = await createIdeaQuestionMap({
      ideaId: "idea-1",
      questionId: "question-1",
      relevanceScore: 5,
      isPrimary: true,
      aiReason: "Fits well",
    });

    expect(speakingIdeaQuestionMapUpdateMany).toHaveBeenCalledWith({
      where: {
        speakingQuestionId: "question-1",
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
    expect(result.id).toBe("map-2");
  });

  it("updates an existing mapping and keeps only one primary", async () => {
    speakingIdeaQuestionMapFindUnique.mockResolvedValue({
      id: "map-1",
      speakingQuestionId: "question-1",
    });
    speakingIdeaQuestionMapUpdate.mockResolvedValue({
      id: "map-1",
      relevanceScore: 4,
      isPrimary: true,
      aiReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      idea: {
        id: "idea-1",
        title: "Saving time",
        shortLabel: "Time-saving",
        status: "ACTIVE",
        reuseScore: 5,
        popularityScore: 5,
      },
      speakingQuestion: {
        id: "question-1",
        taskType: "PART_1",
        topic: "Daily routine",
        subTopic: null,
        prompt: "How do you save time?",
        targetBand: 6.5,
        status: "APPROVED",
      },
    });

    await updateIdeaQuestionMap("map-1", {
      relevanceScore: 4,
      isPrimary: true,
    });

    expect(speakingIdeaQuestionMapUpdateMany).toHaveBeenCalled();
    expect(speakingIdeaQuestionMapUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "map-1" },
        data: expect.objectContaining({
          relevanceScore: 4,
          isPrimary: true,
        }),
      }),
    );
  });

  it("parses AI suggestion JSON and keeps at most one primary", () => {
    const suggestions = parseSuggestionAnswer(
      JSON.stringify({
        suggestions: [
          { ideaId: "idea-1", relevanceScore: 5, isPrimary: true, aiReason: "Best fit" },
          { ideaId: "idea-2", relevanceScore: 4, isPrimary: true, aiReason: "Also useful" },
        ],
      }),
      "ideaId",
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]?.isPrimary).toBe(true);
    expect(suggestions[1]?.isPrimary).toBe(false);
  });

  it("suggests ideas for a question and filters ids outside the candidate pool", async () => {
    ieltsQuestionFindUnique.mockResolvedValue({
      id: "question-1",
      taskType: "PART_1",
      topic: "Daily routine",
      subTopic: null,
      prompt: "How do you save time?",
      targetBand: 6.5,
      supportingPoints: [],
      ideaMappings: [],
    });
    speakingIdeaFindMany.mockResolvedValue([
      {
        id: "idea-1",
        title: "Saving time",
        shortLabel: "Time-saving",
        status: "ACTIVE",
        reuseScore: 5,
        popularityScore: 5,
        descriptionEn: "Useful for convenience answers.",
        variants: [],
        supports: [],
      },
    ]);
    callAiTutor.mockResolvedValue({
      answer: JSON.stringify({
        suggestions: [
          { ideaId: "idea-1", relevanceScore: 5, isPrimary: true, aiReason: "Strong fit" },
          { ideaId: "idea-x", relevanceScore: 5, isPrimary: false, aiReason: "Invalid id" },
        ],
      }),
      conversationId: "conv-1",
    });

    const result = await suggestIdeaQuestionMappings({
      actorId: "admin-1",
      payload: {
        mode: "QUESTION_TO_IDEAS",
        questionId: "question-1",
        limit: 5,
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.targetId).toBe("idea-1");
  });

  it("maps generic AI failure to AI_TUTOR_UNAVAILABLE", async () => {
    speakingIdeaFindUnique.mockResolvedValue({
      id: "idea-1",
      title: "Saving time",
      shortLabel: "Time-saving",
      status: "ACTIVE",
      reuseScore: 5,
      popularityScore: 5,
      descriptionVi: "Mo ta",
      descriptionEn: "Desc",
      questionMaps: [],
      variants: [],
      supports: [],
    });
    ieltsQuestionFindMany.mockResolvedValue([]);
    callAiTutor.mockRejectedValueOnce(new Error("network down"));

    await expect(
      suggestIdeaQuestionMappings({
        actorId: "admin-1",
        payload: {
          mode: "IDEA_TO_QUESTIONS",
          ideaId: "idea-1",
          limit: 5,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });

  it("rethrows upstream AppError unchanged", async () => {
    speakingIdeaFindUnique.mockResolvedValue({
      id: "idea-1",
      title: "Saving time",
      shortLabel: "Time-saving",
      status: "ACTIVE",
      reuseScore: 5,
      popularityScore: 5,
      descriptionVi: "Mo ta",
      descriptionEn: "Desc",
      questionMaps: [],
      variants: [],
      supports: [],
    });
    ieltsQuestionFindMany.mockResolvedValue([]);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      suggestIdeaQuestionMappings({
        actorId: "admin-1",
        payload: {
          mode: "IDEA_TO_QUESTIONS",
          ideaId: "idea-1",
          limit: 5,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });

  it("deletes an existing mapping", async () => {
    speakingIdeaQuestionMapFindUnique.mockResolvedValue({ id: "map-1" });

    await deleteIdeaQuestionMap("map-1");

    expect(speakingIdeaQuestionMapDelete).toHaveBeenCalledWith({
      where: { id: "map-1" },
    });
  });
});
