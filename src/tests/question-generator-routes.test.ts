import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireAdminApiSession = vi.fn();
const generateIeltsSpeakingQuestions = vi.fn();
const setIeltsQuestionStatus = vi.fn();
const bulkSetIeltsQuestionStatus = vi.fn();

vi.mock("@/server/auth", () => ({
  requireAdminApiSession,
}));

vi.mock("@/server/questions/question-generator-service", () => ({
  generateIeltsSpeakingQuestions,
  setIeltsQuestionStatus,
  bulkSetIeltsQuestionStatus,
}));

let generatePost: typeof import("@/app/api/admin/questions/generate/route").POST;
let statusPost: typeof import("@/app/api/admin/questions/status/route").POST;
let bulkPost: typeof import("@/app/api/admin/questions/bulk-status/route").POST;

beforeAll(async () => {
  ({ POST: generatePost } = await import(
    "@/app/api/admin/questions/generate/route"
  ));
  ({ POST: statusPost } = await import(
    "@/app/api/admin/questions/status/route"
  ));
  ({ POST: bulkPost } = await import(
    "@/app/api/admin/questions/bulk-status/route"
  ));
});

beforeEach(() => {
  requireAdminApiSession.mockReset();
  generateIeltsSpeakingQuestions.mockReset();
  setIeltsQuestionStatus.mockReset();
  bulkSetIeltsQuestionStatus.mockReset();
});

const adminUser = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

describe("admin question generate route", () => {
  it("requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateIeltsSpeakingQuestions).not.toHaveBeenCalled();
  });

  it("rejects non-admin users with 403", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects count above the hard cap", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 500 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateIeltsSpeakingQuestions).not.toHaveBeenCalled();
  });

  it("returns AI_TUTOR_UNAVAILABLE when the service throws", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    generateIeltsSpeakingQuestions.mockRejectedValueOnce(
      new AppError(
        "IELTS question generation is not available right now.",
        503,
        "AI_TUTOR_UNAVAILABLE",
      ),
    );

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("AI_TUTOR_UNAVAILABLE");
  });

  it("returns the summary on success", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    generateIeltsSpeakingQuestions.mockResolvedValue({
      batchId: "batch-1",
      created: 3,
      skippedDuplicates: 1,
      parseErrors: [],
      warnings: [],
      questions: [],
    });

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.created).toBe(3);
    expect(body.summary.batchId).toBe("batch-1");
  });
});

describe("admin question status route", () => {
  it("requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await statusPost(
      new Request("http://localhost:3000/api/admin/questions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: "q-1", status: "APPROVED" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(setIeltsQuestionStatus).not.toHaveBeenCalled();
  });

  it("rejects invalid status values", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await statusPost(
      new Request("http://localhost:3000/api/admin/questions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: "q-1", status: "WHATEVER" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});

describe("admin question bulk status route", () => {
  it("requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await bulkPost(
      new Request("http://localhost:3000/api/admin/questions/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: ["q-1"], status: "APPROVED" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(bulkSetIeltsQuestionStatus).not.toHaveBeenCalled();
  });

  it("rejects empty id arrays", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });

    const response = await bulkPost(
      new Request("http://localhost:3000/api/admin/questions/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds: [], status: "APPROVED" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(bulkSetIeltsQuestionStatus).not.toHaveBeenCalled();
  });
});
