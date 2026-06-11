import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const buildFamilyRecommendations = vi.fn();
const getActiveFamilyProfileForUser = vi.fn();
const callAiTutor = vi.fn();
const snapshotFindFirst = vi.fn();
const snapshotUpsert = vi.fn();
const conversationFindMany = vi.fn();
const roleplayFindMany = vi.fn();

vi.mock("@/server/family/family-recommendation-service", () => ({
  buildFamilyRecommendations,
}));

vi.mock("@/server/family/family-profile-service", () => ({
  getActiveFamilyProfileForUser,
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyDailyPlanSnapshot: {
      findFirst: snapshotFindFirst,
      upsert: snapshotUpsert,
    },
    familyConversation: { findMany: conversationFindMany },
    familyRoleplaySession: { findMany: roleplayFindMany },
  },
}));

let generateFamilyDailyPlan: typeof import("@/server/family/family-daily-plan-service").generateFamilyDailyPlan;
let getFamilyDailyPlanForUser: typeof import("@/server/family/family-daily-plan-service").getFamilyDailyPlanForUser;

beforeAll(async () => {
  ({ generateFamilyDailyPlan, getFamilyDailyPlanForUser } = await import(
    "@/server/family/family-daily-plan-service"
  ));
});

beforeEach(() => {
  buildFamilyRecommendations.mockReset();
  getActiveFamilyProfileForUser.mockReset();
  callAiTutor.mockReset();
  snapshotFindFirst.mockReset();
  snapshotUpsert.mockReset();
  conversationFindMany.mockReset();
  roleplayFindMany.mockReset();
});

const baseRecommendations = {
  childFocus: "BOTH" as const,
  generatedAt: "2026-06-11T12:00:00.000Z",
  dueReviewCount: 2,
  weakChunkCount: 1,
  approvedChunkCount: 10,
  recommendedChunks: [],
  recommendedScenario: null,
  recommendedConversation: null,
  recommendedRoleplay: null,
};

describe("generateFamilyDailyPlan", () => {
  it("returns the cached snapshot when the recommendations hash matches", async () => {
    buildFamilyRecommendations.mockResolvedValueOnce(baseRecommendations);
    snapshotFindFirst.mockResolvedValueOnce({
      id: "snap-1",
      userId: "user-1",
      childFocus: "BOTH",
      answer: "# Today's Focus\nCached plan.",
      updatedAt: new Date("2026-06-11T11:00:00.000Z"),
      expiresAt: new Date("2026-06-11T23:00:00.000Z"),
    });

    const result = await generateFamilyDailyPlan({
      userId: "user-1",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.plan.cached).toBe(true);
    expect(callAiTutor).not.toHaveBeenCalled();
    expect(snapshotUpsert).not.toHaveBeenCalled();
  });

  it("calls the AI and caches the snapshot when no fresh cache exists", async () => {
    buildFamilyRecommendations.mockResolvedValueOnce(baseRecommendations);
    snapshotFindFirst.mockResolvedValueOnce(null);
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc + Kiwi + Vivi family.",
    });
    conversationFindMany.mockResolvedValueOnce([{ title: "Car ride to school" }]);
    roleplayFindMany.mockResolvedValueOnce([
      { userRole: "FATHER", aiRole: "KIWI", title: "Father ↔ Kiwi" },
    ]);
    callAiTutor.mockResolvedValueOnce({
      answer: "# Today's Focus\nFresh plan.",
      conversationId: "conv-1",
    });
    snapshotUpsert.mockResolvedValueOnce({
      id: "snap-1",
      userId: "user-1",
      childFocus: "BOTH",
      answer: "# Today's Focus\nFresh plan.",
      updatedAt: new Date("2026-06-11T12:00:00.000Z"),
      expiresAt: new Date("2026-06-12T00:00:00.000Z"),
    });

    const result = await generateFamilyDailyPlan({
      userId: "user-1",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.plan.cached).toBe(false);
    expect(callAiTutor).toHaveBeenCalledTimes(1);
    expect(snapshotUpsert).toHaveBeenCalledTimes(1);
  });

  it("throws AI_TUTOR_UNAVAILABLE when AI fails", async () => {
    buildFamilyRecommendations.mockResolvedValueOnce(baseRecommendations);
    snapshotFindFirst.mockResolvedValueOnce(null);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    conversationFindMany.mockResolvedValueOnce([]);
    roleplayFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(new Error("network down"));

    await expect(
      generateFamilyDailyPlan({
        userId: "user-1",
        now: new Date("2026-06-11T12:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });

    expect(snapshotUpsert).not.toHaveBeenCalled();
  });

  it("regenerates when forceRefresh is true even with a cached snapshot", async () => {
    buildFamilyRecommendations.mockResolvedValueOnce(baseRecommendations);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    conversationFindMany.mockResolvedValueOnce([]);
    roleplayFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: "# Today's Focus\nForced.",
      conversationId: "conv-1",
    });
    snapshotUpsert.mockResolvedValueOnce({
      id: "snap-2",
      userId: "user-1",
      childFocus: "BOTH",
      answer: "# Today's Focus\nForced.",
      updatedAt: new Date("2026-06-11T12:00:00.000Z"),
      expiresAt: new Date("2026-06-12T00:00:00.000Z"),
    });

    const result = await generateFamilyDailyPlan({
      userId: "user-1",
      forceRefresh: true,
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.plan.cached).toBe(false);
    expect(snapshotFindFirst).not.toHaveBeenCalled();
    expect(callAiTutor).toHaveBeenCalledTimes(1);
  });

  it("propagates AppError when AI throws an AppError", async () => {
    buildFamilyRecommendations.mockResolvedValueOnce(baseRecommendations);
    snapshotFindFirst.mockResolvedValueOnce(null);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    conversationFindMany.mockResolvedValueOnce([]);
    roleplayFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      generateFamilyDailyPlan({
        userId: "user-1",
        now: new Date("2026-06-11T12:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });
});

describe("getFamilyDailyPlanForUser", () => {
  it("returns null plan when nothing is cached", async () => {
    buildFamilyRecommendations.mockResolvedValueOnce(baseRecommendations);
    snapshotFindFirst.mockResolvedValueOnce(null);

    const result = await getFamilyDailyPlanForUser({
      userId: "user-1",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.plan).toBeNull();
    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("returns the cached plan when a fresh snapshot exists", async () => {
    buildFamilyRecommendations.mockResolvedValueOnce(baseRecommendations);
    snapshotFindFirst.mockResolvedValueOnce({
      id: "snap-1",
      userId: "user-1",
      childFocus: "BOTH",
      answer: "# Today's Focus\nCached.",
      updatedAt: new Date("2026-06-11T11:00:00.000Z"),
      expiresAt: new Date("2026-06-11T23:00:00.000Z"),
    });

    const result = await getFamilyDailyPlanForUser({
      userId: "user-1",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(result.plan?.cached).toBe(true);
  });
});
