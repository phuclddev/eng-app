import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const extractFamilyChunksFromConversation = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-chunk-service", () => ({
  extractFamilyChunksFromConversation,
}));

let POST: typeof import("@/app/api/family/chunks/extract/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/family/chunks/extract/route"));
});

describe("family chunk extract route", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    extractFamilyChunksFromConversation.mockReset();
  });

  it("requires an approved authenticated user", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/family/chunks/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: "conversation-1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(extractFamilyChunksFromConversation).not.toHaveBeenCalled();
  });

  it("validates the extraction payload", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user-1@example.com",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/chunks/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: "",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(extractFamilyChunksFromConversation).not.toHaveBeenCalled();
  });

  it("surfaces ownership errors cleanly", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user-1@example.com",
      },
    });
    extractFamilyChunksFromConversation.mockRejectedValue(
      new NotFoundError("Family conversation was not found."),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/family/chunks/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: "conversation-1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns extraction summary for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user-1@example.com",
      },
    });
    extractFamilyChunksFromConversation.mockResolvedValue({
      summary: {
        created: 3,
        skippedDuplicates: 1,
        errors: [],
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/chunks/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: "conversation-1",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toEqual({
      created: 3,
      skippedDuplicates: 1,
      errors: [],
    });
    expect(extractFamilyChunksFromConversation).toHaveBeenCalledWith({
      userId: "user-1",
      conversationId: "conversation-1",
    });
  });
});
