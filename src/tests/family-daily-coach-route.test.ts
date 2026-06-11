import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const generateFamilyDailyPlan = vi.fn();
const generateFamilyWeeklyInsightSummary = vi.fn();
const addFamilyFavorite = vi.fn();
const removeFamilyFavorite = vi.fn();
const listFamilyFavoritesForUser = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-daily-plan-service", () => ({
  generateFamilyDailyPlan,
  getFamilyDailyPlanForUser: vi.fn(),
}));

vi.mock("@/server/family/family-insights-service", () => ({
  generateFamilyWeeklyInsightSummary,
  buildFamilyInsightsSnapshot: vi.fn(),
}));

vi.mock("@/server/family/family-favorites-service", () => ({
  addFamilyFavorite,
  removeFamilyFavorite,
  listFamilyFavoritesForUser,
}));

let todayPlanPost: typeof import("@/app/api/family/today/plan/route").POST;
let favoritesGet: typeof import("@/app/api/family/favorites/route").GET;
let favoritesPost: typeof import("@/app/api/family/favorites/route").POST;
let favoritesDelete: typeof import("@/app/api/family/favorites/route").DELETE;
let insightsSummaryPost: typeof import("@/app/api/family/insights/summary/route").POST;

beforeAll(async () => {
  ({ POST: todayPlanPost } = await import(
    "@/app/api/family/today/plan/route"
  ));
  ({
    GET: favoritesGet,
    POST: favoritesPost,
    DELETE: favoritesDelete,
  } = await import("@/app/api/family/favorites/route"));
  ({ POST: insightsSummaryPost } = await import(
    "@/app/api/family/insights/summary/route"
  ));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  generateFamilyDailyPlan.mockReset();
  generateFamilyWeeklyInsightSummary.mockReset();
  addFamilyFavorite.mockReset();
  removeFamilyFavorite.mockReset();
  listFamilyFavoritesForUser.mockReset();
});

const baseUser = { id: "user-1", email: "user-1@example.com" };

describe("family today plan route", () => {
  it("requires an approved user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await todayPlanPost(
      new Request("http://localhost:3000/api/family/today/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateFamilyDailyPlan).not.toHaveBeenCalled();
  });

  it("returns AI_TUTOR_UNAVAILABLE gracefully", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    generateFamilyDailyPlan.mockRejectedValueOnce(
      new AppError("offline", 503, "AI_TUTOR_UNAVAILABLE"),
    );

    const response = await todayPlanPost(
      new Request("http://localhost:3000/api/family/today/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childFocus: "BOTH" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("AI_TUTOR_UNAVAILABLE");
  });

  it("returns the plan and recommendations on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    generateFamilyDailyPlan.mockResolvedValue({
      plan: {
        id: "snap-1",
        childFocus: "BOTH",
        answer: "# Today's Focus\n...",
        cached: false,
        generatedAt: "2026-06-11T12:00:00.000Z",
        expiresAt: "2026-06-12T00:00:00.000Z",
      },
      recommendations: {
        childFocus: "BOTH",
        generatedAt: "2026-06-11T12:00:00.000Z",
        dueReviewCount: 2,
        weakChunkCount: 1,
        approvedChunkCount: 5,
        recommendedChunks: [],
        recommendedScenario: null,
        recommendedConversation: null,
        recommendedRoleplay: null,
      },
    });

    const response = await todayPlanPost(
      new Request("http://localhost:3000/api/family/today/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childFocus: "BOTH" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plan.id).toBe("snap-1");
    expect(body.recommendations.dueReviewCount).toBe(2);
  });
});

describe("family favorites routes", () => {
  it("requires auth for GET", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await favoritesGet();

    expect(response.status).toBe(401);
    expect(listFamilyFavoritesForUser).not.toHaveBeenCalled();
  });

  it("validates POST payload", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await favoritesPost(
      new Request("http://localhost:3000/api/family/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "CHUNK", targetId: "" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(addFamilyFavorite).not.toHaveBeenCalled();
  });

  it("returns ok on DELETE success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    removeFamilyFavorite.mockResolvedValue({ ok: true });

    const response = await favoritesDelete(
      new Request("http://localhost:3000/api/family/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "CHUNK", targetId: "chunk-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});

describe("family insights summary route", () => {
  it("requires auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await insightsSummaryPost(
      new Request("http://localhost:3000/api/family/insights/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateFamilyWeeklyInsightSummary).not.toHaveBeenCalled();
  });

  it("returns AI answer on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    generateFamilyWeeklyInsightSummary.mockResolvedValue({
      answer: "# Weekly Summary\nGood week.",
      cached: false,
    });

    const response = await insightsSummaryPost(
      new Request("http://localhost:3000/api/family/insights/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toContain("Weekly Summary");
  });
});
