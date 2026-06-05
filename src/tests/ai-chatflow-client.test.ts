import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

let callAiTutor: typeof import("@/server/ai/ai-chatflow-client").callAiTutor;

beforeAll(async () => {
  ({ callAiTutor } = await import("@/server/ai/ai-chatflow-client"));
});

describe("AI chatflow client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    process.env.AI_CHATFLOW_URL = "https://ai.insea.io/api/chatflows/22038/run";
    process.env.AI_CHATFLOW_TOKEN = "replace_me";
  });

  it("parses successful responses safely", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          outputs: {
            answer: "  Here is a concise correction.  ",
            conversation_id: "ext-conv-1",
          },
        },
      }),
    });

    await expect(callAiTutor({ query: "Please help" })).resolves.toEqual({
      answer: "Here is a concise correction.",
      conversationId: "ext-conv-1",
    });
  });

  it("returns an upstream error for non-200 responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn(),
    });

    await expect(callAiTutor({ query: "Please help" })).rejects.toMatchObject({
      code: "AI_TUTOR_UPSTREAM_ERROR",
      statusCode: 502,
    });
  });

  it("returns a timeout error when the upstream call aborts", async () => {
    const timeoutError = new Error("The operation was aborted.");
    timeoutError.name = "AbortError";
    fetchMock.mockRejectedValue(timeoutError);

    await expect(callAiTutor({ query: "Please help" })).rejects.toMatchObject({
      code: "AI_TUTOR_TIMEOUT",
      statusCode: 504,
    });
  });
});
