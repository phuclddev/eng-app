import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const generateFamilyScenarios = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-scenario-generator-service", () => ({
  generateFamilyScenarios,
}));

let POST: typeof import("@/app/api/family/scenarios/generate/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/family/scenarios/generate/route"));
});

beforeEach(() => {
  requireApprovedApiSession.mockReset();
  generateFamilyScenarios.mockReset();
});

const baseUser = { id: "user-1", email: "user-1@example.com" };

describe("family scenario generate route", () => {
  it("requires an approved authenticated user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/family/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );

    expect(response.status).toBe(401);
    expect(generateFamilyScenarios).not.toHaveBeenCalled();
  });

  it("rejects counts above the hard cap", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });

    const response = await POST(
      new Request("http://localhost:3000/api/family/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 500 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateFamilyScenarios).not.toHaveBeenCalled();
  });

  it("returns 404 when the user has no active profile", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    generateFamilyScenarios.mockRejectedValueOnce(
      new NotFoundError("Create or activate a family profile before generating scenarios."),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/family/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns the summary on success", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    generateFamilyScenarios.mockResolvedValue({
      created: 2,
      skippedDuplicates: 1,
      scenarios: [],
      warnings: [],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.created).toBe(2);
    expect(body.summary.skippedDuplicates).toBe(1);
  });

  it("returns AI_TUTOR_UNAVAILABLE gracefully", async () => {
    requireApprovedApiSession.mockResolvedValue({ user: baseUser });
    generateFamilyScenarios.mockRejectedValueOnce(
      new AppError(
        "Family scenario generation is not available right now.",
        503,
        "AI_TUTOR_UNAVAILABLE",
      ),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/family/scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("AI_TUTOR_UNAVAILABLE");
  });
});
