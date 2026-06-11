import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const createFamilyRecallLines = vi.fn();
const compareFamilyRecallAttempt = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-conversation-recall-service", () => ({
  createFamilyRecallLines,
  compareFamilyRecallAttempt,
  getFamilyRecallScript: vi.fn(),
}));

let createPost: typeof import("@/app/api/family/conversations/[id]/create-recall/route").POST;
let comparePost: typeof import("@/app/api/family/conversations/[id]/recall/compare/route").POST;

beforeAll(async () => {
  ({ POST: createPost } = await import(
    "@/app/api/family/conversations/[id]/create-recall/route"
  ));
  ({ POST: comparePost } = await import(
    "@/app/api/family/conversations/[id]/recall/compare/route"
  ));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  createFamilyRecallLines.mockReset();
  compareFamilyRecallAttempt.mockReset();
});

const baseUser = { id: "user-1", email: "user-1@example.com" };
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("family create recall route", () => {
  it("requires approved auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await createPost(
      new Request("http://localhost:3000/api/family/conversations/conv-1/create-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      params("conv-1"),
    );

    expect(response.status).toBe(401);
    expect(createFamilyRecallLines).not.toHaveBeenCalled();
  });

  it("propagates not-found from the service", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    createFamilyRecallLines.mockRejectedValueOnce(
      new NotFoundError("Family conversation was not found."),
    );

    const response = await createPost(
      new Request("http://localhost:3000/api/family/conversations/conv-missing/create-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      params("conv-missing"),
    );

    expect(response.status).toBe(404);
  });

  it("returns the recall summary on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    createFamilyRecallLines.mockResolvedValue({
      created: 5,
      conversationId: "conv-1",
      recallUrl: "/family/conversations/conv-1/recall",
    });

    const response = await createPost(
      new Request("http://localhost:3000/api/family/conversations/conv-1/create-recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: false }),
      }),
      params("conv-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.created).toBe(5);
    expect(body.recallUrl).toBe("/family/conversations/conv-1/recall");
  });
});

describe("family recall compare route", () => {
  it("requires approved auth", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await comparePost(
      new Request("http://localhost:3000/api/family/conversations/conv-1/recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId: "line-1", userAnswer: "answer" }),
      }),
      params("conv-1"),
    );

    expect(response.status).toBe(401);
    expect(compareFamilyRecallAttempt).not.toHaveBeenCalled();
  });

  it("rejects short answers", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await comparePost(
      new Request("http://localhost:3000/api/family/conversations/conv-1/recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId: "line-1", userAnswer: "" }),
      }),
      params("conv-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  it("rejects missing lineId", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await comparePost(
      new Request("http://localhost:3000/api/family/conversations/conv-1/recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswer: "Time to brush." }),
      }),
      params("conv-1"),
    );

    expect(response.status).toBe(400);
    expect(compareFamilyRecallAttempt).not.toHaveBeenCalled();
  });

  it("returns AI_TUTOR_UNAVAILABLE when service throws", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    compareFamilyRecallAttempt.mockRejectedValueOnce(
      new AppError(
        "Family recall comparison is not available right now.",
        503,
        "AI_TUTOR_UNAVAILABLE",
      ),
    );

    const response = await comparePost(
      new Request("http://localhost:3000/api/family/conversations/conv-1/recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId: "line-1", userAnswer: "Time to brush." }),
      }),
      params("conv-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("AI_TUTOR_UNAVAILABLE");
  });

  it("returns the comparison result on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    compareFamilyRecallAttempt.mockResolvedValue({
      attempt: {
        id: "attempt-1",
        conversationId: "conv-1",
        lineId: "line-1",
        mode: "LINE",
        userAnswer: "Time to brush.",
        score: 70,
        feedbackMarkdown: "# Score\n70",
        createdAt: "2026-06-11T12:00:00.000Z",
      },
      originalEnglish: "Time to brush your teeth.",
      missingChunks: [{ chunk: "brush your teeth", meaningVi: "đánh răng" }],
    });

    const response = await comparePost(
      new Request("http://localhost:3000/api/family/conversations/conv-1/recall/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineId: "line-1", userAnswer: "Time to brush." }),
      }),
      params("conv-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.attempt.score).toBe(70);
    expect(body.missingChunks).toHaveLength(1);
  });
});
