import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const chatWithAiTutor = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/ai/ai-tutor-service", () => ({
  chatWithAiTutor,
}));

let POST: typeof import("@/app/api/ai-tutor/chat/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/ai-tutor/chat/route"));
});

describe("AI tutor chat route", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    chatWithAiTutor.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Please help",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(chatWithAiTutor).not.toHaveBeenCalled();
  });

  it("rejects pending or blocked users through approved-only RBAC", async () => {
    requireApprovedApiSession.mockRejectedValue(
      new ForbiddenError("Your account is not approved for studying yet."),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Please help",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
    expect(chatWithAiTutor).not.toHaveBeenCalled();
  });

  it("validates input before calling the service", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(chatWithAiTutor).not.toHaveBeenCalled();
  });

  it("returns the AI tutor answer for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
      },
    });
    chatWithAiTutor.mockResolvedValue({
      answer: "Here is a concise sample answer.",
      conversationId: "internal-1",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/ai-tutor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Please help",
          purpose: "GENERAL_CHAT",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      answer: "Here is a concise sample answer.",
      conversationId: "internal-1",
    });
    expect(chatWithAiTutor).toHaveBeenCalledWith({
      userId: "user-1",
      message: "Please help",
      conversationId: undefined,
      purpose: "GENERAL_CHAT",
    });
  });
});
