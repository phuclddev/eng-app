import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "@/lib/errors";

const scriptFindMany = vi.fn();
const scriptFindUnique = vi.fn();
const scriptCreate = vi.fn();
const scriptUpdate = vi.fn();
const sentenceCreateMany = vi.fn();
const sentenceDeleteMany = vi.fn();
const transaction = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    translationScript: {
      findMany: scriptFindMany,
      findUnique: scriptFindUnique,
      create: scriptCreate,
      update: scriptUpdate,
    },
    translationSentence: {
      createMany: sentenceCreateMany,
      deleteMany: sentenceDeleteMany,
    },
  },
}));

let importTranslationCsv: typeof import("@/server/translation/translation-script-service").importTranslationCsv;
let listTranslationScripts: typeof import("@/server/translation/translation-script-service").listTranslationScripts;

beforeAll(async () => {
  ({ importTranslationCsv, listTranslationScripts } = await import(
    "@/server/translation/translation-script-service"
  ));
});

beforeEach(() => {
  scriptFindMany.mockReset();
  scriptFindUnique.mockReset();
  scriptCreate.mockReset();
  scriptUpdate.mockReset();
  sentenceCreateMany.mockReset();
  sentenceDeleteMany.mockReset();
  transaction.mockReset();
  transaction.mockImplementation(
    async (
      callback: (
        tx: {
          translationScript: {
            findUnique: typeof scriptFindUnique;
            create: typeof scriptCreate;
            update: typeof scriptUpdate;
          };
          translationSentence: {
            createMany: typeof sentenceCreateMany;
            deleteMany: typeof sentenceDeleteMany;
          };
        },
      ) => Promise<unknown>,
    ) =>
      callback({
        translationScript: {
          findUnique: scriptFindUnique,
          create: scriptCreate,
          update: scriptUpdate,
        },
        translationSentence: {
          createMany: sentenceCreateMany,
          deleteMany: sentenceDeleteMany,
        },
      }),
  );
});

describe("importTranslationCsv", () => {
  it("rejects an empty CSV", async () => {
    await expect(
      importTranslationCsv({
        adminId: "admin-1",
        csvText: "",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns validation errors without writing when rows are invalid", async () => {
    const csv = `title,topic,bandLevel,englishText,vietnameseText
,Daily Life,6,Wake up,Thức dậy
`;

    const summary = await importTranslationCsv({
      adminId: "admin-1",
      csvText: csv,
    });

    expect(summary.errors.length).toBeGreaterThan(0);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("creates a new script with sentences for first-time imports", async () => {
    const csv = `title,topic,bandLevel,englishText,vietnameseText
Daily Routine,Daily Life,6,I wake up early.,Tôi dậy sớm.
Daily Routine,Daily Life,6,I drink coffee.,Tôi uống cà phê.
`;
    scriptFindUnique.mockResolvedValueOnce(null);
    scriptCreate.mockResolvedValueOnce({ id: "script-1" });
    sentenceCreateMany.mockResolvedValue({});

    const summary = await importTranslationCsv({
      adminId: "admin-1",
      csvText: csv,
    });

    expect(summary.scriptsCreated).toBe(1);
    expect(summary.sentencesCreated).toBe(2);
    expect(sentenceCreateMany).toHaveBeenCalledTimes(1);
  });

  it("rewrites sentences when a script already exists", async () => {
    const csv = `title,topic,bandLevel,englishText,vietnameseText
Daily Routine,Daily Life,6,Updated sentence.,Cập nhật.
`;
    scriptFindUnique.mockResolvedValueOnce({ id: "script-existing" });
    scriptUpdate.mockResolvedValue({ id: "script-existing" });
    sentenceCreateMany.mockResolvedValue({});

    const summary = await importTranslationCsv({
      adminId: "admin-1",
      csvText: csv,
    });

    expect(summary.scriptsUpdated).toBe(1);
    expect(summary.scriptsCreated).toBe(0);
    expect(sentenceDeleteMany).toHaveBeenCalledWith({
      where: { scriptId: "script-existing" },
    });
  });
});

describe("listTranslationScripts", () => {
  it("returns reviewed counts from the user's review rows", async () => {
    scriptFindMany.mockResolvedValueOnce([
      {
        id: "script-1",
        title: "Daily Routine",
        topic: "Daily Life",
        bandLevel: 6,
        updatedAt: new Date("2026-06-11T12:00:00.000Z"),
        sentences: [
          { id: "s1", reviews: [{ reviewCount: 2 }] },
          { id: "s2", reviews: [] },
          { id: "s3", reviews: [{ reviewCount: 0 }] },
        ],
      },
    ]);

    const result = await listTranslationScripts({ userId: "user-1" });

    expect(result).toHaveLength(1);
    expect(result[0].sentenceCount).toBe(3);
    expect(result[0].reviewedCount).toBe(1);
  });
});
