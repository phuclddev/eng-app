import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const getAiChunkCoach = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/ai/chunk-coach-service", () => ({
  getAiChunkCoach,
}));

let POST: typeof import("@/app/api/ai-tutor/chunk-coach/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/ai-tutor/chunk-coach/route"));
});

describe("AI chunk coach route", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    getAiChunkCoach.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/chunk-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chunkId: "chunk-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("returns chunk coach guidance for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    getAiChunkCoach.mockResolvedValue({
      chunk: { id: "chunk-1", chunk: "on top of that" },
      answer: "Structured chunk explanation",
      sections: [],
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/chunk-coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chunkId: "chunk-1" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.answer).toBe("Structured chunk explanation");
    expect(getAiChunkCoach).toHaveBeenCalledWith("chunk-1");
  });
});
