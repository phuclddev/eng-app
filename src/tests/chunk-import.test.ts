import { describe, expect, it } from "vitest";

import {
  executeChunkImport,
  type ChunkImportRepository,
} from "@/server/chunk-import";

type MemoryChunk = {
  bandLevel: number;
  chunk: string;
  deletedAt: Date | null;
  difficulty: number;
  example: string;
  grammarPattern: string | null;
  id: string;
  meaningVi: string;
  notes: null | string;
  tags: string[];
  topicSlug: null | string;
  wrongExamples: string[];
};

type MemoryTopic = {
  id: string;
  name: string;
  slug: string;
};

function buildCsv(rows: string[]) {
  return [
    "chunk,meaning,example,topic,difficulty,band_level,grammar_pattern,tags,notes,wrong_examples",
    ...rows,
  ].join("\n");
}

function createMemoryImportRepository(
  options?: {
    chunks?: MemoryChunk[];
    failOnUpsertAt?: number;
    topics?: MemoryTopic[];
  },
) {
  let chunkSequence = options?.chunks?.length ?? 0;
  let topicSequence = options?.topics?.length ?? 0;
  let state = {
    chunks: structuredClone(options?.chunks ?? []),
    topics: structuredClone(options?.topics ?? []),
  };

  const repository: ChunkImportRepository = {
    async findChunksByKeys(keys) {
      const keySet = new Set(
        keys.map((key) => `${key.chunk}::${key.meaningVi}`),
      );

      return state.chunks
        .filter((chunk) => keySet.has(`${chunk.chunk}::${chunk.meaningVi}`))
        .map((chunk) => ({
          ...chunk,
          wrongExamples: [...chunk.wrongExamples],
          tags: [...chunk.tags],
        }));
    },
    async findTopicsBySlugs(slugs) {
      const slugSet = new Set(slugs);
      return state.topics.filter((topic) => slugSet.has(topic.slug));
    },
    async transaction(callback) {
      const draft = {
        chunks: structuredClone(state.chunks),
        topics: structuredClone(state.topics),
      };
      let upsertCount = 0;

      const result = await callback({
        async createTopic(topic) {
          const created = {
            id: `topic-${topicSequence + 1}`,
            name: topic.name,
            slug: topic.slug,
          };

          topicSequence += 1;
          draft.topics.push(created);
          return created;
        },
        async findTopicsBySlugs(slugs) {
          const slugSet = new Set(slugs);
          return draft.topics.filter((topic) => slugSet.has(topic.slug));
        },
        async upsertChunk(input) {
          upsertCount += 1;

          if (options?.failOnUpsertAt === upsertCount) {
            throw new Error("Forced transaction failure");
          }

          const topicSlug = input.topicId
            ? (draft.topics.find((topic) => topic.id === input.topicId)?.slug ?? null)
            : null;
          const existingIndex = draft.chunks.findIndex(
            (chunk) =>
              chunk.chunk === input.chunk && chunk.meaningVi === input.meaningVi,
          );

          if (existingIndex >= 0) {
            const existing = draft.chunks[existingIndex];
            draft.chunks[existingIndex] = {
              ...existing,
              example: input.example,
              wrongExamples: [...input.wrongExamples],
              difficulty: input.difficulty,
              bandLevel: input.bandLevel,
              grammarPattern: input.grammarPattern,
              tags: [...input.tags],
              notes: input.notes,
              topicSlug,
              deletedAt: null,
            };
            return;
          }

          chunkSequence += 1;
          draft.chunks.push({
            id: `chunk-${chunkSequence}`,
            chunk: input.chunk,
            meaningVi: input.meaningVi,
            example: input.example,
            wrongExamples: [...input.wrongExamples],
            difficulty: input.difficulty,
            bandLevel: input.bandLevel,
            grammarPattern: input.grammarPattern,
            tags: [...input.tags],
            notes: input.notes,
            topicSlug,
            deletedAt: null,
          });
        },
      });

      state = draft;
      return result;
    },
  };

  return {
    repository,
    readState() {
      return structuredClone(state);
    },
  };
}

describe("executeChunkImport", () => {
  it("previews and imports valid CSV rows with create and skip counts", async () => {
    const csv = buildCsv([
      '"play a key role","dong vai tro quan trong","Education plays a key role in growth.","Education",2,6.5,"verb phrase","education, writing","",""',
      '"play a key role","dong vai tro quan trong","Education plays a key role in growth.","Education",2,6.5,"verb phrase","education, writing","",""',
      '"shed light on","lam sang to","The chart sheds light on migration trends.","Task 1",1,6.0,"verb phrase","task1","",""',
    ]);
    const { repository, readState } = createMemoryImportRepository();

    const preview = await executeChunkImport({
      actorId: "admin-1",
      csvText: csv,
      dryRun: true,
      repository,
    });

    expect(preview.summary).toMatchObject({
      totalRows: 3,
      created: 2,
      updated: 0,
      skipped: 1,
      errors: [],
    });
    expect(readState().chunks).toHaveLength(0);

    const result = await executeChunkImport({
      actorId: "admin-1",
      csvText: csv,
      repository,
    });

    expect(result.summary).toMatchObject({
      totalRows: 3,
      created: 2,
      updated: 0,
      skipped: 1,
      errors: [],
    });
    expect(readState().chunks).toHaveLength(2);
    expect(readState().topics).toHaveLength(2);
  });

  it("upserts duplicate chunks and restores archived records instead of duplicating them", async () => {
    const csv = buildCsv([
      '"play a key role","dong vai tro quan trong","Education still plays a key role in long-term growth.","Education",3,7.0,"verb phrase","education, essay","updated","This play key role sentence is wrong"',
    ]);
    const { repository, readState } = createMemoryImportRepository({
      chunks: [
        {
          id: "chunk-1",
          chunk: "play a key role",
          meaningVi: "dong vai tro quan trong",
          example: "Old example.",
          wrongExamples: [],
          difficulty: 1,
          bandLevel: 6,
          grammarPattern: null,
          tags: ["old"],
          notes: null,
          topicSlug: "education",
          deletedAt: new Date("2026-05-20T00:00:00.000Z"),
        },
      ],
      topics: [
        {
          id: "topic-1",
          name: "Education",
          slug: "education",
        },
      ],
    });

    const result = await executeChunkImport({
      actorId: "admin-1",
      csvText: csv,
      repository,
    });

    expect(result.summary).toMatchObject({
      totalRows: 1,
      created: 0,
      updated: 1,
      skipped: 0,
      errors: [],
    });
    expect(readState().chunks).toHaveLength(1);
    expect(readState().chunks[0]).toMatchObject({
      example: "Education still plays a key role in long-term growth.",
      difficulty: 3,
      bandLevel: 7,
      deletedAt: null,
      topicSlug: "education",
    });
  });

  it("returns row errors and does not import anything when validation fails", async () => {
    const csv = buildCsv([
      '"play a key role","dong vai tro quan trong","Education plays a key role in growth.","Education",2,6.5,"verb phrase","education","",""',
      '"short","ngan","bad","Task 1",9,10.0,"","","",""',
    ]);
    const { repository, readState } = createMemoryImportRepository();

    const result = await executeChunkImport({
      actorId: "admin-1",
      csvText: csv,
      repository,
    });

    expect(result.summary.totalRows).toBe(2);
    expect(result.summary.errors).toHaveLength(1);
    expect(result.summary.errors[0]?.rowNumber).toBe(3);
    expect(result.summary.created).toBe(0);
    expect(result.summary.updated).toBe(0);
    expect(readState().chunks).toHaveLength(0);
    expect(readState().topics).toHaveLength(0);
  });

  it("rolls back all writes when the transaction fails mid-import", async () => {
    const csv = buildCsv([
      '"play a key role","dong vai tro quan trong","Education plays a key role in growth.","Education",2,6.5,"verb phrase","education","",""',
      '"shed light on","lam sang to","The chart sheds light on migration trends.","Task 1",1,6.0,"verb phrase","task1","",""',
    ]);
    const { repository, readState } = createMemoryImportRepository({
      failOnUpsertAt: 2,
    });

    await expect(
      executeChunkImport({
        actorId: "admin-1",
        csvText: csv,
        repository,
      }),
    ).rejects.toThrow("Forced transaction failure");

    expect(readState().chunks).toHaveLength(0);
    expect(readState().topics).toHaveLength(0);
  });
});
