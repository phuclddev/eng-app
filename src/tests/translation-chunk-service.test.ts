import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError } from "@/lib/errors";

const sentenceFindUnique = vi.fn();
const topicFindFirst = vi.fn();
const topicCreate = vi.fn();
const chunkUpsert = vi.fn();
const mappingUpsert = vi.fn();
const callAiTutor = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    translationSentence: { findUnique: sentenceFindUnique },
    topic: { findFirst: topicFindFirst, create: topicCreate },
    chunk: { upsert: chunkUpsert },
    translationChunkMapping: { upsert: mappingUpsert },
  },
}));

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

let extractTranslationChunk: typeof import("@/server/translation/translation-chunk-service").extractTranslationChunk;
let saveTranslationChunk: typeof import("@/server/translation/translation-chunk-service").saveTranslationChunk;

beforeAll(async () => {
  ({ extractTranslationChunk, saveTranslationChunk } = await import(
    "@/server/translation/translation-chunk-service"
  ));
});

beforeEach(() => {
  sentenceFindUnique.mockReset();
  topicFindFirst.mockReset();
  topicCreate.mockReset();
  chunkUpsert.mockReset();
  mappingUpsert.mockReset();
  callAiTutor.mockReset();
});

describe("extractTranslationChunk", () => {
  it("rejects missing sentences", async () => {
    sentenceFindUnique.mockResolvedValueOnce(null);

    await expect(
      extractTranslationChunk({
        userId: "user-1",
        payload: { sentenceId: "missing", englishPhrase: "wake up" },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(callAiTutor).not.toHaveBeenCalled();
  });

  it("parses structured JSON from AI", async () => {
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      englishText: "I usually wake up at six.",
      vietnameseText: "Tôi thường thức dậy lúc 6 giờ.",
      script: { title: "Daily Routine", topic: "Daily Life", bandLevel: 6 },
    });
    callAiTutor.mockResolvedValueOnce({
      answer:
        '{"chunk":"wake up at six","meaningVi":"thức dậy lúc 6 giờ","usage":"Use for daily routine","example":"I usually wake up at six on weekdays.","suggestedTopic":"Daily Life","bandEstimate":6.5}',
      conversationId: "conv-1",
    });

    const result = await extractTranslationChunk({
      userId: "user-1",
      payload: { sentenceId: "sentence-1", englishPhrase: "wake up at six" },
    });

    expect(result.chunk).toBe("wake up at six");
    expect(result.bandEstimate).toBe(6.5);
    expect(result.suggestedTopic).toBe("Daily Life");
  });

  it("throws an invalid response error when AI returns malformed JSON", async () => {
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      englishText: "Sentence",
      vietnameseText: "Câu",
      script: { title: "X", topic: "Y", bandLevel: 6 },
    });
    callAiTutor.mockResolvedValueOnce({
      answer: "not json",
      conversationId: "conv-1",
    });

    await expect(
      extractTranslationChunk({
        userId: "user-1",
        payload: { sentenceId: "sentence-1", englishPhrase: "test" },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_INVALID_RESPONSE" });
  });

  it("returns AI_TUTOR_UNAVAILABLE when the upstream call fails", async () => {
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      englishText: "Sentence",
      vietnameseText: "Câu",
      script: { title: "X", topic: "Y", bandLevel: 6 },
    });
    callAiTutor.mockRejectedValueOnce(new Error("network down"));

    await expect(
      extractTranslationChunk({
        userId: "user-1",
        payload: { sentenceId: "sentence-1", englishPhrase: "test" },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });
});

describe("saveTranslationChunk", () => {
  it("rejects missing sentences", async () => {
    sentenceFindUnique.mockResolvedValueOnce(null);

    await expect(
      saveTranslationChunk({
        userId: "user-1",
        payload: {
          sentenceId: "missing",
          englishPhrase: "wake up at six",
          meaningVi: "thức dậy lúc 6 giờ",
          example: "I wake up at six on weekdays.",
          bandEstimate: 6,
          tags: [],
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(chunkUpsert).not.toHaveBeenCalled();
  });

  it("upserts a chunk and its mapping", async () => {
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      scriptId: "script-1",
    });
    topicFindFirst.mockResolvedValueOnce({ id: "topic-1" });
    chunkUpsert.mockResolvedValueOnce({ id: "chunk-1" });
    mappingUpsert.mockResolvedValueOnce({
      id: "mapping-1",
      sentenceId: "sentence-1",
      englishPhrase: "wake up at six",
      meaningVi: "thức dậy lúc 6 giờ",
      chunkId: "chunk-1",
      suggestedTopic: "Daily Life",
      bandEstimate: 6,
    });

    const result = await saveTranslationChunk({
      userId: "user-1",
      payload: {
        sentenceId: "sentence-1",
        englishPhrase: "wake up at six",
        meaningVi: "thức dậy lúc 6 giờ",
        example: "I wake up at six on weekdays.",
        suggestedTopic: "Daily Life",
        bandEstimate: 6,
        tags: [],
      },
    });

    expect(result.chunkId).toBe("chunk-1");
    expect(chunkUpsert).toHaveBeenCalledTimes(1);
    expect(mappingUpsert).toHaveBeenCalledTimes(1);
  });

  it("creates a new topic when none matches", async () => {
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      scriptId: "script-1",
    });
    topicFindFirst.mockResolvedValueOnce(null);
    topicCreate.mockResolvedValueOnce({ id: "topic-new" });
    chunkUpsert.mockResolvedValueOnce({ id: "chunk-2" });
    mappingUpsert.mockResolvedValueOnce({
      id: "mapping-2",
      sentenceId: "sentence-1",
      englishPhrase: "wake up at six",
      meaningVi: "thức dậy lúc 6 giờ",
      chunkId: "chunk-2",
      suggestedTopic: "Brand New",
      bandEstimate: 6,
    });

    await saveTranslationChunk({
      userId: "user-1",
      payload: {
        sentenceId: "sentence-1",
        englishPhrase: "wake up at six",
        meaningVi: "thức dậy lúc 6 giờ",
        example: "I wake up at six on weekdays.",
        suggestedTopic: "Brand New",
        bandEstimate: 6,
        tags: [],
      },
    });

    expect(topicCreate).toHaveBeenCalledTimes(1);
  });
});

describe("extractTranslationChunk passes correct prompt input", () => {
  it("includes the highlighted phrase in the prompt", async () => {
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      englishText: "I usually wake up at six.",
      vietnameseText: "Tôi thường thức dậy lúc 6 giờ.",
      script: { title: "Daily Routine", topic: "Daily Life", bandLevel: 6 },
    });
    callAiTutor.mockImplementationOnce(async ({ query }: { query: string }) => {
      expect(query).toContain("wake up at six");
      expect(query).toContain("Daily Routine");
      return {
        answer:
          '{"chunk":"wake up at six","meaningVi":"thức dậy","usage":"daily","example":"I wake up at six on weekdays.","suggestedTopic":"Daily Life","bandEstimate":6}',
        conversationId: "conv-1",
      };
    });

    const result = await extractTranslationChunk({
      userId: "user-1",
      payload: { sentenceId: "sentence-1", englishPhrase: "wake up at six" },
    });

    expect(result.chunk).toBe("wake up at six");
  });
});

describe("AppError is preserved", () => {
  it("rethrows AppError without wrapping", async () => {
    sentenceFindUnique.mockResolvedValueOnce({
      id: "sentence-1",
      englishText: "test",
      vietnameseText: "thử",
      script: { title: "x", topic: "y", bandLevel: 6 },
    });
    callAiTutor.mockRejectedValueOnce(
      new AppError("custom", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      extractTranslationChunk({
        userId: "user-1",
        payload: { sentenceId: "sentence-1", englishPhrase: "x" },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });
});
