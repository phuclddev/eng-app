import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const compareTranslationRecallAttempt = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/translation/translation-compare-service", () => ({
  compareTranslationRecallAttempt,
}));

let POST: typeof import("@/app/api/translation-recall/compare/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/translation-recall/compare/route"));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  compareTranslationRecallAttempt.mockReset();
});

const baseUser = { id: "user-1", email: "user-1@example.com" };
const validPayload = {
  scriptId: "script-1",
  sentenceId: "sentence-1",
  mode: "SENTENCE",
  userAnswer: "I wake up at six.",
};

describe("translation compare route", () => {
  it("requires authenticated approved user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(401);
    expect(compareTranslationRecallAttempt).not.toHaveBeenCalled();
  });

  it("rejects pending users with 403", async () => {
    requireApprovedApiSession.mockRejectedValue(new ForbiddenError());

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects short answers", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, userAnswer: "" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("rejects SENTENCE mode without sentenceId", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: "script-1",
          mode: "SENTENCE",
          userAnswer: "I wake up at six.",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid mode values", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validPayload, mode: "AUTO" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(compareTranslationRecallAttempt).not.toHaveBeenCalled();
  });

  it("returns the AI_TUTOR_UNAVAILABLE error when the service throws", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    compareTranslationRecallAttempt.mockRejectedValueOnce(
      new AppError(
        "Translation Recall comparison is not available right now.",
        503,
        "AI_TUTOR_UNAVAILABLE",
      ),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("AI_TUTOR_UNAVAILABLE");
  });

  it("returns the comparison result on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    compareTranslationRecallAttempt.mockResolvedValue({
      attempt: {
        id: "attempt-1",
        scriptId: "script-1",
        sentenceId: "sentence-1",
        mode: "SENTENCE",
        userAnswer: validPayload.userAnswer,
        score: 78,
        feedbackMarkdown: "# Score\n78\n",
        createdAt: "2026-06-11T12:00:00.000Z",
      },
      originalEnglish: "I usually wake up at six.",
      missingChunks: [
        { chunk: "wake up at six", meaningVi: "thức dậy lúc 6 giờ" },
      ],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.attempt.score).toBe(78);
    expect(body.missingChunks).toHaveLength(1);
  });
});
