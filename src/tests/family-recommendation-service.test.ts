import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const familyChunkFindMany = vi.fn();
const familyReviewFindMany = vi.fn();
const familyScenarioFindMany = vi.fn();
const familyConversationFindMany = vi.fn();
const familyRoleplayFindMany = vi.fn();
const familyConversationFindFirst = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyChunk: { findMany: familyChunkFindMany },
    familyReviewSchedule: { findMany: familyReviewFindMany },
    familyScenario: { findMany: familyScenarioFindMany },
    familyConversation: {
      findMany: familyConversationFindMany,
      findFirst: familyConversationFindFirst,
    },
    familyRoleplaySession: { findMany: familyRoleplayFindMany },
  },
}));

let buildFamilyRecommendations: typeof import("@/server/family/family-recommendation-service").buildFamilyRecommendations;

beforeAll(async () => {
  ({ buildFamilyRecommendations } = await import(
    "@/server/family/family-recommendation-service"
  ));
});

beforeEach(() => {
  familyChunkFindMany.mockReset();
  familyReviewFindMany.mockReset();
  familyScenarioFindMany.mockReset();
  familyConversationFindMany.mockReset();
  familyRoleplayFindMany.mockReset();
  familyConversationFindFirst.mockReset();
});

describe("buildFamilyRecommendations", () => {
  const now = new Date("2026-06-11T12:00:00.000Z");

  const baseChunk = {
    text: "Brush your teeth",
    meaningVi: "đánh răng",
    exampleSentence: "Please brush your teeth.",
    childFocus: "BOTH",
    speakerRole: "FATHER",
    scenarioCategory: "Bedtime",
    personalizationScore: 3,
    frequencyScore: 3,
  };

  it("returns empty recommendations when the user has no approved chunks", async () => {
    familyChunkFindMany.mockResolvedValueOnce([]);
    familyReviewFindMany.mockResolvedValueOnce([]);
    familyScenarioFindMany.mockResolvedValueOnce([]);
    familyConversationFindMany.mockResolvedValueOnce([]);
    familyRoleplayFindMany.mockResolvedValueOnce([]);
    familyConversationFindFirst.mockResolvedValueOnce(null);

    const result = await buildFamilyRecommendations({
      userId: "user-1",
      now,
    });

    expect(result.recommendedChunks).toEqual([]);
    expect(result.recommendedScenario).toBeNull();
    expect(result.recommendedConversation).toBeNull();
    expect(result.recommendedRoleplay?.aiRole).toBe("KIWI");
    expect(result.approvedChunkCount).toBe(0);
  });

  it("prioritizes due reviews above personalization for the top chunk", async () => {
    familyChunkFindMany.mockResolvedValueOnce([
      { ...baseChunk, id: "chunk-due", personalizationScore: 1, frequencyScore: 1 },
      { ...baseChunk, id: "chunk-personal", personalizationScore: 5, frequencyScore: 5 },
      { ...baseChunk, id: "chunk-fresh" },
    ]);
    familyReviewFindMany.mockResolvedValueOnce([
      {
        familyChunkId: "chunk-due",
        nextReviewAt: new Date("2026-06-10T00:00:00.000Z"),
        masteryScore: 30,
      },
      {
        familyChunkId: "chunk-personal",
        nextReviewAt: new Date("2026-06-30T00:00:00.000Z"),
        masteryScore: 75,
      },
    ]);
    familyScenarioFindMany.mockResolvedValueOnce([]);
    familyConversationFindMany.mockResolvedValueOnce([]);
    familyRoleplayFindMany.mockResolvedValueOnce([]);
    familyConversationFindFirst.mockResolvedValueOnce(null);

    const result = await buildFamilyRecommendations({
      userId: "user-1",
      now,
    });

    expect(result.recommendedChunks[0]?.id).toBe("chunk-due");
    expect(result.recommendedChunks[0]?.reason).toBe("DUE");
    expect(result.dueReviewCount).toBe(1);
  });

  it("filters chunks by child focus when KIWI is selected", async () => {
    familyChunkFindMany.mockResolvedValueOnce([
      { ...baseChunk, id: "chunk-kiwi", childFocus: "KIWI" },
      { ...baseChunk, id: "chunk-vivi", childFocus: "VIVI" },
      { ...baseChunk, id: "chunk-both", childFocus: "BOTH" },
    ]);
    familyReviewFindMany.mockResolvedValueOnce([]);
    familyScenarioFindMany.mockResolvedValueOnce([]);
    familyConversationFindMany.mockResolvedValueOnce([]);
    familyRoleplayFindMany.mockResolvedValueOnce([]);
    familyConversationFindFirst.mockResolvedValueOnce(null);

    const result = await buildFamilyRecommendations({
      userId: "user-1",
      childFocus: "KIWI",
      now,
    });

    expect(
      result.recommendedChunks.every((chunk) => chunk.id !== "chunk-vivi"),
    ).toBe(true);
    expect(result.recommendedRoleplay?.aiRole).toBe("KIWI");
  });

  it("prefers fresh scenarios not used in the last 7 days", async () => {
    familyChunkFindMany.mockResolvedValueOnce([]);
    familyReviewFindMany.mockResolvedValueOnce([]);
    familyScenarioFindMany.mockResolvedValueOnce([
      {
        id: "scenario-stale",
        title: "Stale Scenario",
        category: "Bedtime",
        childFocus: "BOTH",
        description: "Used recently",
        difficulty: 2,
      },
      {
        id: "scenario-fresh",
        title: "Fresh Scenario",
        category: "Meals",
        childFocus: "BOTH",
        description: "Untouched",
        difficulty: 2,
      },
    ]);
    familyConversationFindMany.mockResolvedValueOnce([
      { scenarioId: "scenario-stale" },
    ]);
    familyRoleplayFindMany.mockResolvedValueOnce([]);
    familyConversationFindFirst.mockResolvedValueOnce(null);

    const result = await buildFamilyRecommendations({
      userId: "user-1",
      now,
    });

    expect(result.recommendedScenario?.id).toBe("scenario-fresh");
    expect(result.recommendedScenario?.reason).toBe("FRESH");
  });

  it("alternates roleplay AI role for BOTH focus based on recent history", async () => {
    familyChunkFindMany.mockResolvedValueOnce([]);
    familyReviewFindMany.mockResolvedValueOnce([]);
    familyScenarioFindMany.mockResolvedValueOnce([]);
    familyConversationFindMany.mockResolvedValueOnce([]);
    familyRoleplayFindMany.mockResolvedValueOnce([
      { userRole: "FATHER", aiRole: "KIWI", scenarioId: null },
    ]);
    familyConversationFindFirst.mockResolvedValueOnce(null);

    const result = await buildFamilyRecommendations({
      userId: "user-1",
      childFocus: "BOTH",
      now,
    });

    expect(result.recommendedRoleplay?.aiRole).toBe("VIVI");
  });
});
