import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const generateTranslationRecallFromQuestion = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/translation/translation-recall-from-question-service", () => ({
  generateTranslationRecallFromQuestion,
}));

let POST: typeof import("@/app/api/translation-recall/from-question/route").POST;

beforeAll(async () => {
  ({ POST } = await import(
    "@/app/api/translation-recall/from-question/route"
  ));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  generateTranslationRecallFromQuestion.mockReset();
});

describe("translation-recall from-question route", () => {
  it("requires an approved authenticated user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/from-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakingQuestionId: "q-1" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateTranslationRecallFromQuestion).not.toHaveBeenCalled();
  });

  it("rejects pending users with a forbidden status", async () => {
    requireApprovedApiSession.mockRejectedValue(new ForbiddenError());

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/from-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakingQuestionId: "q-1" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("validates payloads with missing speakingQuestionId", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1", email: "user-1@example.com" },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/from-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ length: "MEDIUM" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateTranslationRecallFromQuestion).not.toHaveBeenCalled();
  });

  it("rejects maxChunks values above the hard cap", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1", email: "user-1@example.com" },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/from-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speakingQuestionId: "q-1",
          maxChunks: 500,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateTranslationRecallFromQuestion).not.toHaveBeenCalled();
  });

  it("returns the response from the service on success", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1", email: "user-1@example.com" },
    });
    generateTranslationRecallFromQuestion.mockResolvedValue({
      script: {
        id: "script-1",
        title: "Family · PART_1",
        topic: "Family",
        bandLevel: 6.5,
        version: 1,
        sentenceCount: 4,
        sourceQuestionId: "q-1",
      },
      usedChunks: [],
      englishMarkdown: "We **spend quality time together**.",
      vietnameseText: "Chúng tôi dành thời gian chất lượng cùng nhau.",
      duplicate: false,
      fallbackUsed: false,
      warnings: [],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/translation-recall/from-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speakingQuestionId: "q-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.script.id).toBe("script-1");
    expect(body.duplicate).toBe(false);
    expect(body.usedChunks).toEqual([]);
  });
});
