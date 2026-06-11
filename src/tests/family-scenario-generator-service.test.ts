import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError } from "@/lib/errors";

const getActiveFamilyProfileForUser = vi.fn();
const scenarioFindMany = vi.fn();
const scenarioCreate = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/family/family-profile-service", () => ({
  getActiveFamilyProfileForUser,
}));

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyScenario: {
      findMany: scenarioFindMany,
      create: scenarioCreate,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let generateFamilyScenarios: typeof import("@/server/family/family-scenario-generator-service").generateFamilyScenarios;

beforeAll(async () => {
  ({ generateFamilyScenarios } = await import(
    "@/server/family/family-scenario-generator-service"
  ));
});

beforeEach(() => {
  getActiveFamilyProfileForUser.mockReset();
  scenarioFindMany.mockReset();
  scenarioCreate.mockReset();
  callAiTutor.mockReset();
});

const validAiResponse = JSON.stringify({
  scenarios: [
    {
      title: "Kiwi refuses to brush teeth",
      category: "Bedtime",
      childFocus: "KIWI",
      description:
        "Kiwi stalls before bed and refuses to brush teeth, asking for one more cartoon.",
      difficulty: 2,
      suggestedGoals: ["Stay calm", "Set a firm boundary"],
      suggestedChunks: ["Just two more minutes", "Time to brush your teeth"],
      aiReason: "Tình huống quen thuộc và hữu ích để rèn câu nói nhẹ nhàng nhưng dứt khoát.",
    },
    {
      title: "Vivi refuses to take her cough medicine",
      category: "Health",
      childFocus: "VIVI",
      description:
        "Vivi has a cough but pushes the spoon away every time Phuc tries to give her syrup.",
      difficulty: 3,
      suggestedGoals: ["Distract gently", "Offer choices"],
      suggestedChunks: ["You can choose the flavor", "Open wide for one second"],
      aiReason: "Bài học tình cảm và giao tiếp khi Vivi bị ốm.",
    },
  ],
});

describe("generateFamilyScenarios", () => {
  it("rejects when no active family profile exists", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);

    await expect(
      generateFamilyScenarios({
        userId: "user-1",
        payload: {
          count: 5,
          includeExistingContext: true,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("returns AI_TUTOR_INVALID_RESPONSE for malformed JSON", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc family profile.",
    });
    scenarioFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: "Not JSON at all.",
      conversationId: "conv-1",
    });

    await expect(
      generateFamilyScenarios({
        userId: "user-1",
        payload: {
          count: 5,
          includeExistingContext: true,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_INVALID_RESPONSE" });

    expect(scenarioCreate).not.toHaveBeenCalled();
  });

  it("maps AI_TUTOR_UNAVAILABLE when upstream fails", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc family profile.",
    });
    scenarioFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(new Error("network down"));

    await expect(
      generateFamilyScenarios({
        userId: "user-1",
        payload: {
          count: 5,
          includeExistingContext: true,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });

  it("rethrows AppError without wrapping", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc family profile.",
    });
    scenarioFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      generateFamilyScenarios({
        userId: "user-1",
        payload: {
          count: 5,
          includeExistingContext: true,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });

  it("creates parsed scenarios as SUGGESTED and skips duplicates by normalized title", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc family profile.",
    });
    scenarioFindMany.mockResolvedValueOnce([
      {
        title: "Kiwi refuses to brush teeth",
        category: "Bedtime",
        status: "APPROVED",
      },
    ]);
    callAiTutor.mockResolvedValueOnce({
      answer: validAiResponse,
      conversationId: "conv-1",
    });
    scenarioCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `id-${(data.title as string).toLowerCase().slice(0, 5)}`,
      userId: data.userId,
      title: data.title,
      category: data.category,
      childFocus: data.childFocus,
      description: data.description,
      difficulty: data.difficulty,
      isActive: data.isActive,
      status: data.status,
      source: data.source,
      aiReason: data.aiReason,
      createdAt: new Date("2026-06-11T12:00:00.000Z"),
      updatedAt: new Date("2026-06-11T12:00:00.000Z"),
    }));

    const summary = await generateFamilyScenarios({
      userId: "user-1",
      payload: {
        count: 5,
        includeExistingContext: true,
      },
    });

    expect(summary.created).toBe(1);
    expect(summary.skippedDuplicates).toBe(1);
    expect(summary.scenarios[0].status).toBe("SUGGESTED");
    expect(summary.scenarios[0].source).toBe("AI");
    expect(scenarioCreate).toHaveBeenCalledTimes(1);
  });

  it("returns a warning when AI generates only duplicates", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc family profile.",
    });
    scenarioFindMany.mockResolvedValueOnce([
      {
        title: "Kiwi refuses to brush teeth",
        category: "Bedtime",
        status: "APPROVED",
      },
      {
        title: "Vivi refuses to take her cough medicine",
        category: "Health",
        status: "APPROVED",
      },
    ]);
    callAiTutor.mockResolvedValueOnce({
      answer: validAiResponse,
      conversationId: "conv-1",
    });

    const summary = await generateFamilyScenarios({
      userId: "user-1",
      payload: {
        count: 5,
        includeExistingContext: true,
      },
    });

    expect(summary.created).toBe(0);
    expect(summary.skippedDuplicates).toBe(2);
    expect(summary.warnings.length).toBeGreaterThan(0);
    expect(scenarioCreate).not.toHaveBeenCalled();
  });

  it("dedupes near-duplicate titles inside the same batch", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc family profile.",
    });
    scenarioFindMany.mockResolvedValueOnce([]);
    callAiTutor.mockResolvedValueOnce({
      answer: JSON.stringify({
        scenarios: [
          {
            title: "Bedtime struggle",
            category: "Bedtime",
            childFocus: "BOTH",
            description: "Children stall at bedtime asking for water and cartoons.",
            difficulty: 2,
            suggestedGoals: ["Stay calm"],
            suggestedChunks: ["Lights out in five minutes"],
            aiReason: "Tình huống lặp lại mỗi tối.",
          },
          {
            title: "  Bedtime Struggle  ",
            category: "Bedtime",
            childFocus: "BOTH",
            description: "Similar bedtime stalling scenario with extra excuses.",
            difficulty: 2,
            suggestedGoals: ["Stay calm"],
            suggestedChunks: ["Lights out in five minutes"],
            aiReason: "Bản trùng lặp.",
          },
        ],
      }),
      conversationId: "conv-1",
    });
    scenarioCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "id-bedtime",
      userId: data.userId,
      title: data.title,
      category: data.category,
      childFocus: data.childFocus,
      description: data.description,
      difficulty: data.difficulty,
      isActive: data.isActive,
      status: data.status,
      source: data.source,
      aiReason: data.aiReason,
      createdAt: new Date("2026-06-11T12:00:00.000Z"),
      updatedAt: new Date("2026-06-11T12:00:00.000Z"),
    }));

    const summary = await generateFamilyScenarios({
      userId: "user-1",
      payload: {
        count: 5,
        includeExistingContext: true,
      },
    });

    expect(summary.created).toBe(1);
    expect(summary.skippedDuplicates).toBe(1);
  });
});
