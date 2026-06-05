import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const getAiMissingChunksRecommendation = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/ai/missing-chunks-service", () => ({
  getAiMissingChunksRecommendation,
}));

let POST: typeof import("@/app/api/ai-tutor/missing-chunks/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/ai-tutor/missing-chunks/route"));
});

describe("AI missing chunks route", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    getAiMissingChunksRecommendation.mockReset();
  });

  it("validates input before calling the service", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/missing-chunks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userAnswer: "bad" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(getAiMissingChunksRecommendation).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated access", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/missing-chunks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAnswer: "I like this city because it is peaceful.",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns missing chunk recommendations for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    getAiMissingChunksRecommendation.mockResolvedValue({
      answer: "Use one of the main reasons here.",
      sections: [],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/missing-chunks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: "Describe a city you enjoy visiting.",
          userAnswer: "I like this city because it is peaceful and cheap.",
          topic: "Travel",
          part: "PART_2",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toBe("Use one of the main reasons here.");
  });
});
