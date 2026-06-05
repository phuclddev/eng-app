import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const getAiStudyCoachSnapshot = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/ai/study-coach-service", () => ({
  getAiStudyCoachSnapshot,
}));

let POST: typeof import("@/app/api/ai-tutor/study-coach/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/ai-tutor/study-coach/route"));
});

describe("AI study coach route", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    getAiStudyCoachSnapshot.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/study-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns a cached or generated study coach snapshot for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    getAiStudyCoachSnapshot.mockResolvedValue({
      id: "snapshot-1",
      answer: "Short diagnosis...",
      sections: [],
      generatedAt: new Date().toISOString(),
      expiresAt: null,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/study-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          forceRefresh: true,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("snapshot-1");
    expect(getAiStudyCoachSnapshot).toHaveBeenCalledWith({
      userId: "user-1",
      forceRefresh: true,
    });
  });
});
