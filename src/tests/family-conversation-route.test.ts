import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const generateFamilyConversation = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/family/family-conversation-service", () => ({
  generateFamilyConversation,
}));

let POST: typeof import("@/app/api/family/conversations/generate/route").POST;

beforeAll(async () => {
  ({ POST } = await import("@/app/api/family/conversations/generate/route"));
});

describe("family conversation generate route", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    generateFamilyConversation.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await POST(
      new Request("http://localhost:3000/api/family/conversations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenarioId: "scenario-1",
          childFocus: "BOTH",
          conversationLength: "MEDIUM",
          targetLevel: "NATURAL",
          vietnameseSupport: true,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("UNAUTHORIZED");
    expect(generateFamilyConversation).not.toHaveBeenCalled();
  });

  it("validates the payload before calling the service", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user-1@example.com",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/conversations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenarioId: "",
          childFocus: "BOTH",
          conversationLength: "MEDIUM",
          targetLevel: "NATURAL",
          vietnameseSupport: true,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("VALIDATION_ERROR");
    expect(generateFamilyConversation).not.toHaveBeenCalled();
  });

  it("surfaces missing active profile errors cleanly", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user-1@example.com",
      },
    });
    generateFamilyConversation.mockRejectedValue(
      new NotFoundError("Create or reactivate your Family Profile before generating a conversation."),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/family/conversations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenarioId: "scenario-1",
          childFocus: "BOTH",
          conversationLength: "MEDIUM",
          targetLevel: "NATURAL",
          vietnameseSupport: true,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns the saved conversation for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user-1@example.com",
      },
    });
    generateFamilyConversation.mockResolvedValue({
      id: "conversation-1",
      userId: "user-1",
      scenarioId: "scenario-1",
      childFocus: "BOTH",
      title: "Car ride to school · Kiwi & Vivi",
      conversationMarkdown: "# Situation\nMorning rush.",
      aiConversationId: "external-1",
      createdAt: new Date("2026-06-08T08:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-06-08T08:00:00.000Z").toISOString(),
      scenario: {
        id: "scenario-1",
        title: "Car ride to school",
        category: "Routine",
      },
    });

    const response = await POST(
      new Request("http://localhost:3000/api/family/conversations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenarioId: "scenario-1",
          childFocus: "BOTH",
          conversationLength: "MEDIUM",
          targetLevel: "NATURAL",
          vietnameseSupport: true,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.conversation.title).toBe("Car ride to school · Kiwi & Vivi");
    expect(generateFamilyConversation).toHaveBeenCalledWith({
      userId: "user-1",
      email: "user-1@example.com",
      payload: {
        scenarioId: "scenario-1",
        childFocus: "BOTH",
        conversationLength: "MEDIUM",
        targetLevel: "NATURAL",
        vietnameseSupport: true,
      },
    });
  });
});
