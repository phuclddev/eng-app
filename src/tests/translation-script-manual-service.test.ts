import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, NotFoundError, ValidationError } from "@/lib/errors";

const scriptFindUnique = vi.fn();
const scriptCreate = vi.fn();
const scriptUpdate = vi.fn();
const scriptDelete = vi.fn();
const sentenceCreateMany = vi.fn();
const sentenceDeleteMany = vi.fn();
const chunkFindMany = vi.fn();
const transaction = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    translationScript: {
      findUnique: scriptFindUnique,
      create: scriptCreate,
      update: scriptUpdate,
      delete: scriptDelete,
    },
    translationSentence: {
      createMany: sentenceCreateMany,
      deleteMany: sentenceDeleteMany,
    },
    chunk: {
      findMany: chunkFindMany,
    },
  },
}));

let createTranslationScript: typeof import("@/server/translation/translation-script-service").createTranslationScript;
let updateTranslationScript: typeof import("@/server/translation/translation-script-service").updateTranslationScript;
let deleteTranslationScript: typeof import("@/server/translation/translation-script-service").deleteTranslationScript;

beforeAll(async () => {
  ({
    createTranslationScript,
    updateTranslationScript,
    deleteTranslationScript,
  } = await import("@/server/translation/translation-script-service"));
});

beforeEach(() => {
  scriptFindUnique.mockReset();
  scriptCreate.mockReset();
  scriptUpdate.mockReset();
  scriptDelete.mockReset();
  sentenceCreateMany.mockReset();
  sentenceDeleteMany.mockReset();
  chunkFindMany.mockReset();
  transaction.mockReset();

  transaction.mockImplementation(
    async (
      callback: (tx: {
        translationScript: {
          create: typeof scriptCreate;
          update: typeof scriptUpdate;
        };
        translationSentence: {
          createMany: typeof sentenceCreateMany;
          deleteMany: typeof sentenceDeleteMany;
        };
      }) => Promise<unknown>,
    ) =>
      callback({
        translationScript: { create: scriptCreate, update: scriptUpdate },
        translationSentence: {
          createMany: sentenceCreateMany,
          deleteMany: sentenceDeleteMany,
        },
      }),
  );
});

const samplePayload = {
  title: "Daily Routine",
  topic: "Daily Life",
  bandLevel: 6,
  notes: null,
  sentences: [
    {
      english: "I usually wake up at six.",
      vietnamese: "Tôi thường thức dậy lúc 6 giờ.",
    },
    {
      english: "I have a cup of coffee.",
      vietnamese: "Tôi uống một tách cà phê.",
    },
  ],
};

function mockFullScriptRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "script-1",
    title: samplePayload.title,
    topic: samplePayload.topic,
    bandLevel: samplePayload.bandLevel,
    notes: null,
    updatedAt: new Date("2026-06-11T12:00:00.000Z"),
    sentences: samplePayload.sentences.map((pair, index) => ({
      id: `sentence-${index}`,
      orderIndex: index,
      englishText: pair.english,
      vietnameseText: pair.vietnamese,
      notes: null,
      reviews: [],
      chunkMappings: [],
    })),
    sourceType: "MANUAL",
    sourceQuestionId: null,
    version: 1,
    generatedByAi: false,
    usedChunkIds: null,
    ...overrides,
  };
}

describe("createTranslationScript", () => {
  it("rejects duplicate (title, topic) pairs", async () => {
    scriptFindUnique.mockResolvedValueOnce({ id: "existing" });

    await expect(
      createTranslationScript({
        adminId: "admin-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "TRANSLATION_SCRIPT_DUPLICATE" });

    expect(scriptCreate).not.toHaveBeenCalled();
  });

  it("creates a manual script + sentences", async () => {
    scriptFindUnique.mockResolvedValueOnce(null);
    scriptCreate.mockResolvedValueOnce({ id: "script-1" });
    sentenceCreateMany.mockResolvedValueOnce({});
    scriptFindUnique.mockResolvedValueOnce(mockFullScriptRecord());
    chunkFindMany.mockResolvedValueOnce([]);

    const result = await createTranslationScript({
      adminId: "admin-1",
      payload: samplePayload,
    });

    expect(result.id).toBe("script-1");
    expect(result.sentences).toHaveLength(2);
    expect(scriptCreate).toHaveBeenCalledTimes(1);
    const createArgs = scriptCreate.mock.calls[0][0] as {
      data: { sourceType: string; generatedByAi: boolean; fingerprint: string };
    };
    expect(createArgs.data.sourceType).toBe("MANUAL");
    expect(createArgs.data.generatedByAi).toBe(false);
    expect(createArgs.data.fingerprint).toHaveLength(40);
  });

  it("requires at least one sentence pair", async () => {
    scriptFindUnique.mockResolvedValueOnce(null);

    await expect(
      createTranslationScript({
        adminId: "admin-1",
        payload: { ...samplePayload, sentences: [] },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("updateTranslationScript", () => {
  it("rejects unknown script ids", async () => {
    scriptFindUnique.mockResolvedValueOnce(null);

    await expect(
      updateTranslationScript({
        adminId: "admin-1",
        scriptId: "missing",
        payload: samplePayload,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects when the new fingerprint collides with another script", async () => {
    scriptFindUnique
      .mockResolvedValueOnce({ id: "script-1", fingerprint: "old" })
      .mockResolvedValueOnce({ id: "script-other" });

    await expect(
      updateTranslationScript({
        adminId: "admin-1",
        scriptId: "script-1",
        payload: samplePayload,
      }),
    ).rejects.toMatchObject({ code: "TRANSLATION_SCRIPT_DUPLICATE" });

    expect(scriptUpdate).not.toHaveBeenCalled();
  });

  it("rewrites sentences when sentences change", async () => {
    scriptFindUnique
      .mockResolvedValueOnce({ id: "script-1", fingerprint: "old" })
      .mockResolvedValueOnce(null);
    scriptUpdate.mockResolvedValueOnce({ id: "script-1" });
    sentenceDeleteMany.mockResolvedValueOnce({ count: 2 });
    sentenceCreateMany.mockResolvedValueOnce({});
    scriptFindUnique.mockResolvedValueOnce(mockFullScriptRecord());
    chunkFindMany.mockResolvedValueOnce([]);

    const result = await updateTranslationScript({
      adminId: "admin-1",
      scriptId: "script-1",
      payload: samplePayload,
    });

    expect(result.sentences).toHaveLength(2);
    expect(sentenceDeleteMany).toHaveBeenCalledWith({
      where: { scriptId: "script-1" },
    });
    expect(sentenceCreateMany).toHaveBeenCalledTimes(1);
  });
});

describe("deleteTranslationScript", () => {
  it("rejects unknown ids", async () => {
    scriptFindUnique.mockResolvedValueOnce(null);

    await expect(
      deleteTranslationScript({
        adminId: "admin-1",
        scriptId: "missing",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(scriptDelete).not.toHaveBeenCalled();
  });

  it("deletes when the script exists", async () => {
    scriptFindUnique.mockResolvedValueOnce({ id: "script-1" });
    scriptDelete.mockResolvedValueOnce({ id: "script-1" });

    const result = await deleteTranslationScript({
      adminId: "admin-1",
      scriptId: "script-1",
    });

    expect(result.ok).toBe(true);
    expect(scriptDelete).toHaveBeenCalledWith({ where: { id: "script-1" } });
  });

  it("preserves AppError code paths", async () => {
    scriptFindUnique.mockResolvedValueOnce({ id: "script-1" });
    scriptDelete.mockRejectedValueOnce(
      new AppError("db down", 502, "INTERNAL_SERVER_ERROR"),
    );

    await expect(
      deleteTranslationScript({
        adminId: "admin-1",
        scriptId: "script-1",
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
