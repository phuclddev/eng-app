import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const familyChunkCount = vi.fn();
const familyReviewCount = vi.fn();
const familyPracticeAnswerFindMany = vi.fn();
const familyPracticeSessionFindMany = vi.fn();
const familyPracticeSessionCount = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyChunk: {
      count: familyChunkCount,
    },
    familyReviewSchedule: {
      count: familyReviewCount,
    },
    familyPracticeAnswer: {
      findMany: familyPracticeAnswerFindMany,
    },
    familyPracticeSession: {
      findMany: familyPracticeSessionFindMany,
      count: familyPracticeSessionCount,
    },
  },
}));

let buildFamilyDashboardSnapshot: typeof import("@/server/family/family-dashboard-service").buildFamilyDashboardSnapshot;

beforeAll(async () => {
  ({ buildFamilyDashboardSnapshot } = await import(
    "@/server/family/family-dashboard-service"
  ));
});

beforeEach(() => {
  familyChunkCount.mockReset();
  familyReviewCount.mockReset();
  familyPracticeAnswerFindMany.mockReset();
  familyPracticeSessionFindMany.mockReset();
  familyPracticeSessionCount.mockReset();
});

describe("buildFamilyDashboardSnapshot", () => {
  it("computes weekly accuracy and top scenarios", async () => {
    familyChunkCount.mockResolvedValueOnce(10);
    familyReviewCount.mockResolvedValueOnce(4);
    familyReviewCount.mockResolvedValueOnce(2);
    familyPracticeAnswerFindMany.mockResolvedValueOnce([
      {
        isCorrect: true,
        familyChunk: { scenarioCategory: "Bedtime", speakerRole: "FATHER" },
      },
      {
        isCorrect: false,
        familyChunk: { scenarioCategory: "Bedtime", speakerRole: "FATHER" },
      },
      {
        isCorrect: true,
        familyChunk: { scenarioCategory: "Meals", speakerRole: "CHILD" },
      },
    ]);
    familyPracticeSessionFindMany.mockResolvedValueOnce([
      { completedAt: new Date("2026-06-11T10:00:00.000Z") },
      { completedAt: new Date("2026-06-10T10:00:00.000Z") },
    ]);
    familyPracticeSessionCount.mockResolvedValueOnce(2);
    familyPracticeSessionFindMany.mockResolvedValueOnce([
      {
        id: "session-1",
        mode: "DAILY",
        totalQuestions: 5,
        correctAnswers: 4,
        score: 80,
        completedAt: new Date("2026-06-11T10:00:00.000Z"),
      },
    ]);

    const dashboard = await buildFamilyDashboardSnapshot({
      userId: "user-1",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(dashboard.totalApprovedChunks).toBe(10);
    expect(dashboard.chunksLearned).toBe(4);
    expect(dashboard.dueReviews).toBe(2);
    expect(dashboard.weeklyAccuracy).toBe(67);
    expect(dashboard.totalSessions).toBe(2);
    expect(dashboard.familyStreakDays).toBe(2);
    expect(dashboard.topScenarios[0]).toMatchObject({
      scenarioCategory: "Bedtime",
      attempts: 2,
    });
    expect(dashboard.topSpeakerRoles[0]).toMatchObject({
      speakerRole: "FATHER",
      attempts: 2,
    });
    expect(dashboard.recentActivity).toHaveLength(1);
  });

  it("returns zeros when no family activity exists", async () => {
    familyChunkCount.mockResolvedValueOnce(0);
    familyReviewCount.mockResolvedValueOnce(0);
    familyReviewCount.mockResolvedValueOnce(0);
    familyPracticeAnswerFindMany.mockResolvedValueOnce([]);
    familyPracticeSessionFindMany.mockResolvedValueOnce([]);
    familyPracticeSessionCount.mockResolvedValueOnce(0);
    familyPracticeSessionFindMany.mockResolvedValueOnce([]);

    const dashboard = await buildFamilyDashboardSnapshot({
      userId: "user-1",
      now: new Date("2026-06-11T12:00:00.000Z"),
    });

    expect(dashboard).toMatchObject({
      totalApprovedChunks: 0,
      chunksLearned: 0,
      dueReviews: 0,
      weeklyAccuracy: 0,
      familyStreakDays: 0,
      totalSessions: 0,
      topScenarios: [],
      topSpeakerRoles: [],
      recentActivity: [],
    });
  });
});
