import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const generateFamilyPracticeFeedback = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-practice-ai-feedback-service", () => ({
  generateFamilyPracticeFeedback,
}));

let POST: typeof import("@/app/api/family/practice/ai-feedback/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/family/practice/ai-feedback/route"));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  generateFamilyPracticeFeedback.mockReset();
});

describe("family practice AI feedback route", () => {
  it("requires an approved authenticated user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/family/practice/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyChunkId: "chunk-1",
          prompt: "prompt",
          userAnswer: "answer",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateFamilyPracticeFeedback).not.toHaveBeenCalled();
  });

  it("validates the payload before calling the AI", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/practice/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyChunkId: "",
          prompt: "",
          userAnswer: "",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateFamilyPracticeFeedback).not.toHaveBeenCalled();
  });

  it("returns a graceful error when AI is unavailable without blocking practice", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    generateFamilyPracticeFeedback.mockRejectedValueOnce(
      new AppError(
        "Family practice feedback is not available right now.",
        503,
        "AI_TUTOR_UNAVAILABLE",
      ),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/family/practice/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyChunkId: "chunk-1",
          prompt: "Continue the conversation as Dad.",
          userAnswer: "Okay, please brush your teeth before bed.",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("AI_TUTOR_UNAVAILABLE");
  });

  it("returns the generated answer on success", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    generateFamilyPracticeFeedback.mockResolvedValueOnce({
      answer: "# Improved Reply\nLet's brush your teeth together.",
      available: true,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/practice/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyChunkId: "chunk-1",
          prompt: "Continue the conversation as Dad.",
          userAnswer: "Okay, please brush your teeth before bed.",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.available).toBe(true);
    expect(body.answer).toContain("Improved Reply");
  });
});
