import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError } from "@/lib/errors";

const familyChunkFindFirst = vi.fn();
const callAiTutor = vi.fn();
const getActiveFamilyProfileForUser = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyChunk: {
      findFirst: familyChunkFindFirst,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

vi.mock("@/server/family/family-profile-service", () => ({
  getActiveFamilyProfileForUser,
}));

let generateFamilyPracticeFeedback: typeof import("@/server/family/family-practice-ai-feedback-service").generateFamilyPracticeFeedback;

beforeAll(async () => {
  ({ generateFamilyPracticeFeedback } = await import(
    "@/server/family/family-practice-ai-feedback-service"
  ));
});

beforeEach(() => {
  familyChunkFindFirst.mockReset();
  callAiTutor.mockReset();
  getActiveFamilyProfileForUser.mockReset();
});

describe("generateFamilyPracticeFeedback", () => {
  const payload = {
    familyChunkId: "chunk-1",
    prompt: "Continue the conversation as Dad.",
    userAnswer: "Okay sweetie, please brush your teeth before bed.",
  };

  it("rejects family chunks owned by other users", async () => {
    familyChunkFindFirst.mockResolvedValueOnce(null);

    await expect(
      generateFamilyPracticeFeedback({
        userId: "user-1",
        payload,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("rejects non-approved family chunks", async () => {
    familyChunkFindFirst.mockResolvedValueOnce({
      id: "chunk-1",
      userId: "user-1",
      status: "SUGGESTED",
      text: "Brush your teeth",
      meaningVi: "đánh răng",
      usageContext: "Bedtime",
      speakerRole: "FATHER",
      scenarioCategory: "Bedtime",
    });

    await expect(
      generateFamilyPracticeFeedback({
        userId: "user-1",
        payload,
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("returns the AI markdown answer when available", async () => {
    familyChunkFindFirst.mockResolvedValueOnce({
      id: "chunk-1",
      userId: "user-1",
      status: "APPROVED",
      text: "Brush your teeth",
      meaningVi: "đánh răng",
      usageContext: "Bedtime",
      speakerRole: "FATHER",
      scenarioCategory: "Bedtime",
    });
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Family info",
    });
    callAiTutor.mockResolvedValueOnce({
      answer: "# Improved Reply\nBrush your teeth, sweetie.",
      conversationId: "conv-1",
    });

    const result = await generateFamilyPracticeFeedback({
      userId: "user-1",
      payload,
    });

    expect(result.available).toBe(true);
    expect(result.answer).toContain("Improved Reply");
  });

  it("returns a friendly error when AI fails", async () => {
    familyChunkFindFirst.mockResolvedValueOnce({
      id: "chunk-1",
      userId: "user-1",
      status: "APPROVED",
      text: "Brush your teeth",
      meaningVi: "đánh răng",
      usageContext: "Bedtime",
      speakerRole: "FATHER",
      scenarioCategory: "Bedtime",
    });
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockRejectedValueOnce(new Error("upstream unavailable"));

    await expect(
      generateFamilyPracticeFeedback({
        userId: "user-1",
        payload,
      }),
    ).rejects.toMatchObject({
      code: "AI_TUTOR_UNAVAILABLE",
    });
  });
});
