import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

const requireApprovedApiSession = vi.fn();
const startSpeakingSimulator = vi.fn();
const sendSpeakingSimulatorMessage = vi.fn();

vi.mock("@/server/auth", () => ({
  requireApprovedApiSession,
}));

vi.mock("@/server/ai/speaking-simulator-service", () => ({
  startSpeakingSimulator,
  sendSpeakingSimulatorMessage,
}));

let startPOST: typeof import("@/app/api/ai-tutor/speaking-simulator/start/route").POST;
let messagePOST: typeof import("@/app/api/ai-tutor/speaking-simulator/message/route").POST;

beforeAll(async () => {
  ({ POST: startPOST } = await import("@/app/api/ai-tutor/speaking-simulator/start/route"));
  ({ POST: messagePOST } = await import("@/app/api/ai-tutor/speaking-simulator/message/route"));
});

describe("AI speaking simulator routes", () => {
  beforeEach(() => {
    requireApprovedApiSession.mockReset();
    startSpeakingSimulator.mockReset();
    sendSpeakingSimulatorMessage.mockReset();
  });

  it("starts a simulator session for approved users", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    startSpeakingSimulator.mockResolvedValue({
      id: "session-1",
    });

    const response = await startPOST(
      new Request("http://localhost:3000/api/ai-tutor/speaking-simulator/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          part: "PART_1",
          numberOfTurns: 5,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe("session-1");
    expect(startSpeakingSimulator).toHaveBeenCalledWith("user-1", {
      part: "PART_1",
      numberOfTurns: 5,
    });
  });

  it("rejects unauthorized simulator message access", async () => {
    requireApprovedApiSession.mockRejectedValue(new UnauthorizedError());

    const response = await messagePOST(
      new Request("http://localhost:3000/api/ai-tutor/speaking-simulator/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: "session-1",
          message: "Here is my answer.",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("surfaces ownership errors when messaging another user's session", async () => {
    requireApprovedApiSession.mockResolvedValue({
      user: { id: "user-1" },
    });
    sendSpeakingSimulatorMessage.mockRejectedValue(
      new ForbiddenError("This simulator session does not belong to you."),
    );

    const response = await messagePOST(
      new Request("http://localhost:3000/api/ai-tutor/speaking-simulator/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: "session-1",
          message: "Here is my answer.",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("FORBIDDEN");
  });
});
