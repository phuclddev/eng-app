import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const create = vi.fn();
const count = vi.fn();
const findMany = vi.fn();
const findFirstConversation = vi.fn();
const deleteConversation = vi.fn();
const callAiTutor = vi.fn();
const getActiveFamilyProfileForUser = vi.fn();
const getFamilyScenarioByIdForUser = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyConversation: {
      create,
      count,
      findMany,
      findFirst: findFirstConversation,
      delete: deleteConversation,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

vi.mock("@/server/family/family-profile-service", () => ({
  getActiveFamilyProfileForUser,
}));

vi.mock("@/server/family/family-scenario-service", () => ({
  getFamilyScenarioByIdForUser,
}));

let generateFamilyConversation: typeof import("@/server/family/family-conversation-service").generateFamilyConversation;

beforeAll(async () => {
  ({ generateFamilyConversation } = await import(
    "@/server/family/family-conversation-service"
  ));
});

describe("family conversation service", () => {
  beforeEach(() => {
    create.mockReset();
    count.mockReset();
    findMany.mockReset();
    findFirstConversation.mockReset();
    deleteConversation.mockReset();
    callAiTutor.mockReset();
    getActiveFamilyProfileForUser.mockReset();
    getFamilyScenarioByIdForUser.mockReset();
  });

  it("requires an active family profile before generating", async () => {
    getActiveFamilyProfileForUser.mockResolvedValue(null);

    await expect(
      generateFamilyConversation({
        userId: "user-1",
        email: "dinhphuc.luu@garena.vn",
        payload: {
          scenarioId: "scenario-1",
          childFocus: "BOTH",
          conversationLength: "MEDIUM",
          targetLevel: "NATURAL",
          vietnameseSupport: true,
        },
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });

    expect(callAiTutor).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("does not save a conversation if the AI request fails", async () => {
    getActiveFamilyProfileForUser.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      title: "Phuc Family",
      profileMarkdown: "# Family summary",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    getFamilyScenarioByIdForUser.mockResolvedValue({
      id: "scenario-1",
      userId: "user-1",
      title: "Bedtime struggle",
      category: "Bedtime",
      childFocus: "BOTH",
      description: "Children delay bedtime and want more attention.",
      difficulty: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    callAiTutor.mockRejectedValue(
      new AppError("AI Tutor is temporarily unavailable.", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      generateFamilyConversation({
        userId: "user-1",
        email: "dinhphuc.luu@garena.vn",
        payload: {
          scenarioId: "scenario-1",
          childFocus: "BOTH",
          conversationLength: "MEDIUM",
          targetLevel: "NATURAL",
          vietnameseSupport: true,
        },
      }),
    ).rejects.toMatchObject({
      code: "AI_TUTOR_UPSTREAM_ERROR",
      statusCode: 502,
    });

    expect(create).not.toHaveBeenCalled();
  });

  it("saves the generated family conversation for the same owner", async () => {
    getActiveFamilyProfileForUser.mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      title: "Phuc Family",
      profileMarkdown: "# Family summary\nKiwi and Vivi are twins.",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    getFamilyScenarioByIdForUser.mockResolvedValue({
      id: "scenario-1",
      userId: "user-1",
      title: "Car ride to school",
      category: "Routine",
      childFocus: "BOTH",
      description: "Morning car ride with traffic and sleepy kids.",
      difficulty: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    callAiTutor.mockResolvedValue({
      answer: "# Situation\nMorning rush.\n\n# Conversation\nDad: Let's go.\nKiwi: I want my phone.",
      conversationId: "external-conversation-1",
    });
    create.mockResolvedValue({
      id: "conversation-1",
      userId: "user-1",
      scenarioId: "scenario-1",
      childFocus: "BOTH",
      title: "Car ride to school · Kiwi & Vivi",
      conversationMarkdown:
        "# Situation\nMorning rush.\n\n# Conversation\nDad: Let's go.\nKiwi: I want my phone.",
      aiConversationId: "external-conversation-1",
      createdAt: new Date("2026-06-08T08:00:00.000Z"),
      updatedAt: new Date("2026-06-08T08:00:00.000Z"),
      scenario: {
        id: "scenario-1",
        title: "Car ride to school",
        category: "Routine",
      },
    });

    const result = await generateFamilyConversation({
      userId: "user-1",
      email: "dinhphuc.luu@garena.vn",
      payload: {
        scenarioId: "scenario-1",
        childFocus: "BOTH",
        conversationLength: "MEDIUM",
        targetLevel: "NATURAL",
        vietnameseSupport: true,
      },
    });

    expect(callAiTutor).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        scenarioId: "scenario-1",
        childFocus: "BOTH",
        title: "Car ride to school · Kiwi & Vivi",
        conversationMarkdown:
          "# Situation\nMorning rush.\n\n# Conversation\nDad: Let's go.\nKiwi: I want my phone.",
        aiConversationId: "external-conversation-1",
      },
      include: {
        scenario: {
          select: {
            id: true,
            title: true,
            category: true,
          },
        },
      },
    });
    expect(result.title).toBe("Car ride to school · Kiwi & Vivi");
    expect(result.scenario.title).toBe("Car ride to school");
  });
});
