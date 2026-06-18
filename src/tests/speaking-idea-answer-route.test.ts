import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const requireAdminApiSession = vi.fn();
const generateSpeakingIdeaAnswer = vi.fn();

vi.mock("@/server/auth", () => ({
  requireAdminApiSession,
}));

vi.mock("@/server/speaking-ideas/idea-answer-service", () => ({
  generateSpeakingIdeaAnswer,
}));

let generateAnswerPost: typeof import("@/app/api/admin/ideas/generate-answer/route").POST;

beforeAll(async () => {
  ({ POST: generateAnswerPost } = await import("@/app/api/admin/ideas/generate-answer/route"));
});

beforeEach(() => {
  requireAdminApiSession.mockReset();
  generateSpeakingIdeaAnswer.mockReset();
});

const adminUser = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

describe("admin speaking idea answer generation route", () => {
  it("requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await generateAnswerPost(
      new Request("http://localhost:3000/api/admin/ideas/generate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: "question-1",
          ideaId: "idea-1",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateSpeakingIdeaAnswer).not.toHaveBeenCalled();
  });

  it("rejects non-admin users with 403", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await generateAnswerPost(
      new Request("http://localhost:3000/api/admin/ideas/generate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: "question-1",
          ideaId: "idea-1",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid payload", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await generateAnswerPost(
      new Request("http://localhost:3000/api/admin/ideas/generate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: "",
          ideaId: "",
          targetBand: 10,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("passes through not-found validation from the service", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    generateSpeakingIdeaAnswer.mockRejectedValue(new NotFoundError("Question was not found."));

    const response = await generateAnswerPost(
      new Request("http://localhost:3000/api/admin/ideas/generate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: "missing",
          ideaId: "idea-1",
        }),
      }),
    );

    expect(response.status).toBe(404);
  });

  it("returns the saved generated answer payload on success", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    generateSpeakingIdeaAnswer.mockResolvedValue({
      answer: {
        questionId: "question-1",
        ideaId: "idea-1",
        targetBand: 6.5,
        length: "MEDIUM",
        answerMarkdown: "# Sample Answer",
        generatedAt: "2026-06-18T00:00:00.000Z",
      },
      selectedChunkCount: 8,
      usedChunks: [],
    });

    const response = await generateAnswerPost(
      new Request("http://localhost:3000/api/admin/ideas/generate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: "question-1",
          ideaId: "idea-1",
          targetBand: 6.5,
          length: "MEDIUM",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer.ideaId).toBe("idea-1");
    expect(body.selectedChunkCount).toBe(8);
  });
});
