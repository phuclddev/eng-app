import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireAdminApiSession = vi.fn();
const generateSpeakingIdeas = vi.fn();

vi.mock("@/server/auth", () => ({
  requireAdminApiSession,
}));

vi.mock("@/server/speaking-ideas/idea-generator-service", () => ({
  generateSpeakingIdeas,
}));

let generatePost: typeof import("@/app/api/admin/ideas/generate/route").POST;

beforeAll(async () => {
  ({ POST: generatePost } = await import("@/app/api/admin/ideas/generate/route"));
});

beforeEach(() => {
  requireAdminApiSession.mockReset();
  generateSpeakingIdeas.mockReset();
});

const adminUser = { id: "admin-1", email: "admin@example.com", role: "ADMIN" };

describe("admin speaking idea generate route", () => {
  it("requires admin auth", async () => {
    requireAdminApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateSpeakingIdeas).not.toHaveBeenCalled();
  });

  it("rejects non-admin users with 403", async () => {
    requireAdminApiSession.mockRejectedValue(new ForbiddenError());

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/ideas/generate", {
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
      new Request("http://localhost:3000/api/admin/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 99 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateSpeakingIdeas).not.toHaveBeenCalled();
  });

  it("returns AI_TUTOR_UNAVAILABLE when the service throws", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    generateSpeakingIdeas.mockRejectedValueOnce(
      new AppError(
        "Speaking idea generation is not available right now.",
        503,
        "AI_TUTOR_UNAVAILABLE",
      ),
    );

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("AI_TUTOR_UNAVAILABLE");
  });

  it("returns the generation summary on success", async () => {
    requireAdminApiSession.mockResolvedValue({ user: adminUser });
    generateSpeakingIdeas.mockResolvedValue({
      batchId: "batch-1",
      created: 2,
      skippedDuplicates: 1,
      parseErrors: [],
      warnings: [],
      ideas: [],
    });

    const response = await generatePost(
      new Request("http://localhost:3000/api/admin/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5, includeExistingContext: true }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.created).toBe(2);
    expect(body.summary.skippedDuplicates).toBe(1);
  });
});
