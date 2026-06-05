import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const createSession = vi.fn();
const createMessage = vi.fn();
const updateSession = vi.fn();
const findUpdatedSession = vi.fn();
const findQuestion = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    aiSimulatorSession: {
      findUnique,
      create: createSession,
      update: updateSession,
    },
    aiSimulatorMessage: {
      create: createMessage,
    },
    ieltsQuestion: {
      findUnique: findQuestion,
    },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        aiSimulatorMessage: {
          create: createMessage,
        },
        aiSimulatorSession: {
          update: updateSession,
          findUnique: findUpdatedSession,
        },
      }),
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let startSpeakingSimulator: typeof import("@/server/ai/speaking-simulator-service").startSpeakingSimulator;
let sendSpeakingSimulatorMessage: typeof import("@/server/ai/speaking-simulator-service").sendSpeakingSimulatorMessage;

beforeAll(async () => {
  ({ startSpeakingSimulator, sendSpeakingSimulatorMessage } = await import(
    "@/server/ai/speaking-simulator-service"
  ));
});

describe("speaking simulator service", () => {
  beforeEach(() => {
    findUnique.mockReset();
    createSession.mockReset();
    createMessage.mockReset();
    updateSession.mockReset();
    findUpdatedSession.mockReset();
    findQuestion.mockReset();
    callAiTutor.mockReset();
  });

  it("starts a new simulator session with the first examiner question", async () => {
    callAiTutor.mockResolvedValue({
      answer: "Let's start. Do you enjoy living in your hometown?",
      conversationId: "external-1",
    });
    createSession.mockResolvedValue({
      id: "session-1",
      part: "PART_1",
      topic: "Hometown",
      prompt: null,
      targetBand: 6.5,
      numberOfTurns: 5,
      currentTurn: 0,
      status: "ACTIVE",
      finalFeedback: null,
      finalFeedbackSections: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        {
          id: "message-1",
          role: "EXAMINER",
          content: "Let's start. Do you enjoy living in your hometown?",
          turnNumber: 0,
          createdAt: new Date(),
        },
      ],
    });

    const session = await startSpeakingSimulator("user-1", {
      part: "PART_1",
      topic: "Hometown",
      targetBand: 6.5,
      numberOfTurns: 5,
    });

    expect(callAiTutor).toHaveBeenCalledTimes(1);
    expect(createSession).toHaveBeenCalled();
    expect(session.id).toBe("session-1");
    expect(session.messages[0]?.role).toBe("EXAMINER");
  });

  it("prevents users from messaging another user's simulator session", async () => {
    findUnique.mockResolvedValue({
      id: "session-2",
      userId: "user-2",
      part: "PART_2",
      topic: "Travel",
      prompt: "Describe a memorable trip you enjoyed.",
      targetBand: 6.5,
      numberOfTurns: 5,
      currentTurn: 1,
      status: "ACTIVE",
      externalConversationId: "external-2",
      finalFeedback: null,
      finalFeedbackSections: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
    });

    await expect(
      sendSpeakingSimulatorMessage("user-1", {
        sessionId: "session-2",
        message: "Here is my answer.",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });

    expect(callAiTutor).not.toHaveBeenCalled();
  });
});
