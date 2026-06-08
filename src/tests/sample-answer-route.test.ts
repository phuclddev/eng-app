import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const generateQuestionSampleAnswer = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/ai/sample-answer-service", () => ({
  generateQuestionSampleAnswer,
}));

let POST: typeof import("@/app/api/ai-tutor/sample-answer/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/ai-tutor/sample-answer/route"));
});

describe("AI sample answer route", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    generateQuestionSampleAnswer.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/sample-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          speakingPromptId: "question-1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("validates the payload before calling the service", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/sample-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          speakingPromptId: "question-1",
          maxChunks: 81,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateQuestionSampleAnswer).not.toHaveBeenCalled();
  });

  it("returns a generated sample answer for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    generateQuestionSampleAnswer.mockResolvedValue({
      answer: "## Sample answer\nI would say **on top of that**...",
      speakingPromptId: "question-1",
      selectedChunkCount: 8,
      targetBand: 6.5,
      usedChunks: [
        {
          id: "chunk-1",
          chunk: "on top of that",
          meaningVi: "hon nua",
          topic: "Hometown",
          bandLevel: 6.5,
          usageRole: "SUPPORTING_DETAIL",
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/sample-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          speakingPromptId: "question-1",
          targetBand: 6.5,
          maxChunks: 24,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toContain("## Sample answer");
    expect(generateQuestionSampleAnswer).toHaveBeenCalledWith({
      speakingPromptId: "question-1",
      targetBand: 6.5,
      maxChunks: 24,
    });
  });
});
