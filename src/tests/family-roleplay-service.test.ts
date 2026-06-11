import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";

const sessionFindUnique = vi.fn();
const sessionFindMany = vi.fn();
const sessionCreate = vi.fn();
const sessionUpdate = vi.fn();
const scenarioFindFirst = vi.fn();
const messageCreate = vi.fn();
const transaction = vi.fn();
const callAiTutor = vi.fn();
const getActiveFamilyProfileForUser = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    familyRoleplaySession: {
      findUnique: sessionFindUnique,
      findMany: sessionFindMany,
      create: sessionCreate,
      update: sessionUpdate,
    },
    familyRoleplayMessage: {
      create: messageCreate,
    },
    familyScenario: {
      findFirst: scenarioFindFirst,
    },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

vi.mock("@/server/family/family-profile-service", () => ({
  getActiveFamilyProfileForUser,
}));

let startFamilyRoleplaySession: typeof import("@/server/family/family-roleplay-service").startFamilyRoleplaySession;
let sendFamilyRoleplayMessage: typeof import("@/server/family/family-roleplay-service").sendFamilyRoleplayMessage;
let finishFamilyRoleplaySession: typeof import("@/server/family/family-roleplay-service").finishFamilyRoleplaySession;
let archiveFamilyRoleplaySession: typeof import("@/server/family/family-roleplay-service").archiveFamilyRoleplaySession;
let getFamilyRoleplaySessionForUser: typeof import("@/server/family/family-roleplay-service").getFamilyRoleplaySessionForUser;

beforeAll(async () => {
  ({
    startFamilyRoleplaySession,
    sendFamilyRoleplayMessage,
    finishFamilyRoleplaySession,
    archiveFamilyRoleplaySession,
    getFamilyRoleplaySessionForUser,
  } = await import("@/server/family/family-roleplay-service"));
});

const baseTimestamps = {
  startedAt: new Date("2026-06-11T10:00:00.000Z"),
  completedAt: null,
  createdAt: new Date("2026-06-11T10:00:00.000Z"),
  updatedAt: new Date("2026-06-11T10:00:00.000Z"),
};

const baseScenario = {
  id: "scenario-1",
  title: "Asking for phone in the car",
  category: "Conflict",
  description: "Kiwi wants to play Sonic on the phone during the school commute.",
  childFocus: "KIWI" as const,
};

const baseSession = {
  id: "session-1",
  userId: "user-1",
  scenarioId: "scenario-1",
  userRole: "FATHER" as const,
  aiRole: "KIWI" as const,
  childFocus: "BOTH" as const,
  targetLevel: "NATURAL",
  title: "Father ↔ Kiwi · Asking for phone in the car",
  status: "ACTIVE" as const,
  turnsLimit: 6,
  turnsTaken: 0,
  externalConversationId: "conv-1",
  finalFeedbackMarkdown: null,
  ...baseTimestamps,
  scenario: baseScenario,
  messages: [
    {
      id: "msg-1",
      sender: "AI" as const,
      roleLabel: "Kiwi",
      content: "Dad, can I play Sonic just for five minutes?",
      turnNumber: 0,
      createdAt: new Date("2026-06-11T10:00:01.000Z"),
    },
  ],
};

beforeEach(() => {
  sessionFindUnique.mockReset();
  sessionFindMany.mockReset();
  sessionCreate.mockReset();
  sessionUpdate.mockReset();
  scenarioFindFirst.mockReset();
  messageCreate.mockReset();
  transaction.mockReset();
  callAiTutor.mockReset();
  getActiveFamilyProfileForUser.mockReset();

  transaction.mockImplementation(
    async (
      callback: (
        tx: {
          familyRoleplayMessage: { create: typeof messageCreate };
          familyRoleplaySession: { update: typeof sessionUpdate };
        },
      ) => Promise<unknown>,
    ) =>
      callback({
        familyRoleplayMessage: { create: messageCreate },
        familyRoleplaySession: { update: sessionUpdate },
      }),
  );
});

describe("startFamilyRoleplaySession", () => {
  it("rejects scenarios owned by other users", async () => {
    scenarioFindFirst.mockResolvedValueOnce(null);
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);

    await expect(
      startFamilyRoleplaySession({
        userId: "user-1",
        payload: {
          scenarioId: "scenario-99",
          userRole: "FATHER",
          aiRole: "KIWI",
          childFocus: "BOTH",
          targetLevel: "NATURAL",
          turnsLimit: 6,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(callAiTutor).not.toHaveBeenCalled();
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("returns a friendly error when AI fails", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce(null);
    callAiTutor.mockRejectedValueOnce(new Error("upstream offline"));

    await expect(
      startFamilyRoleplaySession({
        userId: "user-1",
        payload: {
          userRole: "FATHER",
          aiRole: "KIWI",
          childFocus: "BOTH",
          targetLevel: "NATURAL",
          turnsLimit: 6,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });

    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("creates a session with the AI first message and external conversation id", async () => {
    getActiveFamilyProfileForUser.mockResolvedValueOnce({
      profileMarkdown: "Phuc with Kiwi and Vivi in Hanoi.",
    });
    callAiTutor.mockResolvedValueOnce({
      answer: "Dad, can I play Sonic just for five minutes?",
      conversationId: "conv-1",
    });
    sessionCreate.mockResolvedValueOnce(baseSession);

    const result = await startFamilyRoleplaySession({
      userId: "user-1",
      payload: {
        userRole: "FATHER",
        aiRole: "KIWI",
        childFocus: "BOTH",
        targetLevel: "NATURAL",
        turnsLimit: 6,
      },
    });

    expect(sessionCreate).toHaveBeenCalledTimes(1);
    const createArgs = sessionCreate.mock.calls[0][0] as {
      data: {
        userId: string;
        externalConversationId?: string;
        messages: { create: { content: string; sender: string } };
      };
    };
    expect(createArgs.data.userId).toBe("user-1");
    expect(createArgs.data.externalConversationId).toBe("conv-1");
    expect(createArgs.data.messages.create.sender).toBe("AI");
    expect(result.aiRole).toBe("KIWI");
    expect(result.userRole).toBe("FATHER");
  });
});

describe("sendFamilyRoleplayMessage", () => {
  it("rejects sessions owned by other users", async () => {
    sessionFindUnique.mockResolvedValueOnce({ ...baseSession, userId: "user-other" });

    await expect(
      sendFamilyRoleplayMessage({
        userId: "user-1",
        payload: {
          sessionId: "session-1",
          message: "Not now sweetie",
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("blocks messages on archived sessions", async () => {
    sessionFindUnique.mockResolvedValueOnce({
      ...baseSession,
      status: "ARCHIVED",
    });

    await expect(
      sendFamilyRoleplayMessage({
        userId: "user-1",
        payload: { sessionId: "session-1", message: "hi" },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("uses the stored external conversation id, not a browser-provided one", async () => {
    sessionFindUnique.mockResolvedValueOnce(baseSession);
    callAiTutor.mockResolvedValueOnce({
      answer: "But just five minutes please!",
      conversationId: "conv-2",
    });
    sessionFindUnique.mockResolvedValueOnce({
      ...baseSession,
      turnsTaken: 1,
      externalConversationId: "conv-2",
    });

    await sendFamilyRoleplayMessage({
      userId: "user-1",
      payload: { sessionId: "session-1", message: "Not now sweetie, dinner first." },
    });

    expect(callAiTutor).toHaveBeenCalledWith({
      query: expect.stringContaining("Stay in character"),
      conversationId: "conv-1",
    });
  });

  it("returns a friendly error if the AI fails", async () => {
    sessionFindUnique.mockResolvedValueOnce(baseSession);
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      sendFamilyRoleplayMessage({
        userId: "user-1",
        payload: { sessionId: "session-1", message: "hi" },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });

    expect(messageCreate).not.toHaveBeenCalled();
  });
});

describe("finishFamilyRoleplaySession", () => {
  it("marks the session COMPLETED with final feedback when AI succeeds", async () => {
    sessionFindUnique.mockResolvedValueOnce(baseSession);
    callAiTutor.mockResolvedValueOnce({
      answer: "# Overall Feedback\nGreat first round.",
      conversationId: "conv-1",
    });
    sessionFindUnique.mockResolvedValueOnce({
      ...baseSession,
      status: "COMPLETED",
      finalFeedbackMarkdown: "# Overall Feedback\nGreat first round.",
    });

    const result = await finishFamilyRoleplaySession({
      userId: "user-1",
      payload: { sessionId: "session-1" },
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.finalFeedbackMarkdown).toContain("Overall Feedback");
    expect(sessionUpdate).toHaveBeenCalledTimes(1);
  });

  it("still completes when AI fails, with a fallback message", async () => {
    sessionFindUnique.mockResolvedValueOnce(baseSession);
    callAiTutor.mockRejectedValueOnce(new Error("upstream gone"));
    sessionFindUnique.mockResolvedValueOnce({
      ...baseSession,
      status: "COMPLETED",
      finalFeedbackMarkdown: "_Family roleplay coach is not available right now. Your transcript is saved._",
    });

    const result = await finishFamilyRoleplaySession({
      userId: "user-1",
      payload: { sessionId: "session-1" },
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.finalFeedbackMarkdown).toContain("not available");
  });

  it("rejects finishing an empty transcript", async () => {
    sessionFindUnique.mockResolvedValueOnce({
      ...baseSession,
      messages: [],
    });

    await expect(
      finishFamilyRoleplaySession({
        userId: "user-1",
        payload: { sessionId: "session-1" },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("archiveFamilyRoleplaySession", () => {
  it("requires ownership", async () => {
    sessionFindUnique.mockResolvedValueOnce({
      ...baseSession,
      userId: "user-other",
    });

    await expect(
      archiveFamilyRoleplaySession({
        userId: "user-1",
        sessionId: "session-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("flips status to ARCHIVED for the owner", async () => {
    sessionFindUnique.mockResolvedValueOnce(baseSession);
    sessionUpdate.mockResolvedValueOnce({
      ...baseSession,
      status: "ARCHIVED",
      scenario: { title: baseScenario.title },
    });

    const result = await archiveFamilyRoleplaySession({
      userId: "user-1",
      sessionId: "session-1",
    });

    expect(result.status).toBe("ARCHIVED");
  });
});

describe("getFamilyRoleplaySessionForUser", () => {
  it("rejects sessions belonging to other users", async () => {
    sessionFindUnique.mockResolvedValueOnce({
      ...baseSession,
      userId: "user-other",
    });

    await expect(
      getFamilyRoleplaySessionForUser({
        userId: "user-1",
        sessionId: "session-1",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("returns the mapped record for the owner", async () => {
    sessionFindUnique.mockResolvedValueOnce(baseSession);

    const result = await getFamilyRoleplaySessionForUser({
      userId: "user-1",
      sessionId: "session-1",
    });

    expect(result.id).toBe("session-1");
    expect(result.messages).toHaveLength(1);
  });
});
