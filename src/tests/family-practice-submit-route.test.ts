import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const submitFamilyPracticeSession = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-practice-service", () => ({
  buildFamilyPracticeDeckForUser: vi.fn(),
  submitFamilyPracticeSession,
}));

let POST: typeof import("@/app/api/family/practice/submit/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/family/practice/submit/route"));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  submitFamilyPracticeSession.mockReset();
});

describe("family practice submit route", () => {
  it("requires an approved authenticated user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/family/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DAILY", answers: [] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(submitFamilyPracticeSession).not.toHaveBeenCalled();
  });

  it("rejects payloads without answers", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1", email: "user-1@example.com" },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "DAILY", answers: [] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(submitFamilyPracticeSession).not.toHaveBeenCalled();
  });

  it("returns the session id and summary on success", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1", email: "user-1@example.com" },
    });
    submitFamilyPracticeSession.mockResolvedValue({
      sessionId: "session-1",
      summary: {
        totalQuestions: 1,
        correctAnswers: 1,
        averageResponseMs: 4000,
        accuracyRate: 100,
        score: 100,
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/practice/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "DAILY",
          answers: [
            {
              familyChunkId: "chunk-1",
              exerciseType: "VI_TO_CHUNK",
              prompt: "p",
              expectedAnswer: "Brush your teeth",
              userAnswer: "Brush your teeth",
              isCorrect: true,
              responseTimeMs: 4000,
              confidenceLevel: "EASY",
            },
          ],
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.sessionId).toBe("session-1");
    expect(body.summary.score).toBe(100);
  });
});
