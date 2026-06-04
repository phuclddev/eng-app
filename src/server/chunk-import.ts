import { validateChunkCsv } from "@/lib/csv";
import { slugify, toStringArray } from "@/lib/utils";

type ExistingChunkSnapshot = {
  id: string;
  chunk: string;
  meaningVi: string;
  example: string;
  wrongExamples: unknown;
  difficulty: number;
  bandLevel: number;
  grammarPattern: string | null;
  tags: unknown;
  notes: string | null;
  topicSlug: string | null;
  deletedAt: Date | null;
};

type ExistingTopicSnapshot = {
  id: string;
  name: string;
  slug: string;
};

type ChunkKey = {
  chunk: string;
  meaningVi: string;
};

type PersistChunkInput = {
  actorId: string;
  bandLevel: number;
  chunk: string;
  difficulty: number;
  example: string;
  grammarPattern: string | null;
  meaningVi: string;
  notes: string | null;
  tags: string[];
  topicId: string | null;
  wrongExamples: string[];
};

type ChunkImportTransaction = {
  createTopic(topic: {
    name: string;
    slug: string;
  }): Promise<ExistingTopicSnapshot>;
  findTopicsBySlugs(slugs: string[]): Promise<ExistingTopicSnapshot[]>;
  upsertChunk(input: PersistChunkInput): Promise<void>;
};

export type ChunkImportRepository = {
  findChunksByKeys(keys: ChunkKey[]): Promise<ExistingChunkSnapshot[]>;
  findTopicsBySlugs(slugs: string[]): Promise<ExistingTopicSnapshot[]>;
  transaction<T>(
    callback: (transaction: ChunkImportTransaction) => Promise<T>,
  ): Promise<T>;
};

export type ChunkImportError = {
  message: string;
  rowNumber?: number;
};

export type ChunkImportSummary = {
  created: number;
  errors: ChunkImportError[];
  skipped: number;
  totalRows: number;
  updated: number;
};

type NormalizedImportRow = {
  bandLevel: number;
  chunk: string;
  difficulty: number;
  example: string;
  grammarPattern: string | null;
  key: string;
  meaningVi: string;
  notes: string | null;
  rowNumber: number;
  tags: string[];
  topicName: string | null;
  topicSlug: string | null;
  wrongExamples: string[];
};

type ChunkImportOperation =
  | { row: NormalizedImportRow; status: "create" }
  | { existingId: string; row: NormalizedImportRow; status: "update" }
  | { existingId: string; row: NormalizedImportRow; status: "skip" };

type ChunkImportPlan = {
  operations: ChunkImportOperation[];
  summary: ChunkImportSummary;
};

function normalizeKeyPart(value: string) {
  return value.trim().normalize("NFKC").toLowerCase();
}

function buildChunkKey(chunk: string, meaningVi: string) {
  return `${normalizeKeyPart(chunk)}::${normalizeKeyPart(meaningVi)}`;
}

function normalizeImportRow(
  row: ReturnType<typeof validateChunkCsv>["rows"][number],
  rowNumber: number,
): NormalizedImportRow {
  const topicName = row.topic ? row.topic.trim() : "";

  return {
    rowNumber,
    key: buildChunkKey(row.chunk, row.meaning),
    chunk: row.chunk,
    meaningVi: row.meaning,
    example: row.example,
    topicName: topicName || null,
    topicSlug: topicName ? slugify(topicName) : null,
    difficulty: row.difficulty,
    bandLevel: row.band_level,
    grammarPattern: row.grammar_pattern || null,
    tags: row.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    notes: row.notes || null,
    wrongExamples: row.wrong_examples
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function normalizeExistingChunk(chunk: ExistingChunkSnapshot) {
  return {
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    wrongExamples: toStringArray(chunk.wrongExamples),
    difficulty: chunk.difficulty,
    bandLevel: chunk.bandLevel,
    grammarPattern: chunk.grammarPattern,
    tags: toStringArray(chunk.tags),
    notes: chunk.notes,
    topicSlug: chunk.topicSlug,
    deletedAt: chunk.deletedAt,
  };
}

function rowsMatch(left: NormalizedImportRow, right: NormalizedImportRow) {
  return (
    left.chunk === right.chunk &&
    left.meaningVi === right.meaningVi &&
    left.example === right.example &&
    JSON.stringify(left.wrongExamples) === JSON.stringify(right.wrongExamples) &&
    left.difficulty === right.difficulty &&
    left.bandLevel === right.bandLevel &&
    left.grammarPattern === right.grammarPattern &&
    JSON.stringify(left.tags) === JSON.stringify(right.tags) &&
    left.notes === right.notes &&
    left.topicSlug === right.topicSlug
  );
}

function chunkMatchesRow(
  existingChunk: ExistingChunkSnapshot,
  row: NormalizedImportRow,
) {
  const existing = normalizeExistingChunk(existingChunk);

  return (
    existing.chunk === row.chunk &&
    existing.meaningVi === row.meaningVi &&
    existing.example === row.example &&
    JSON.stringify(existing.wrongExamples) === JSON.stringify(row.wrongExamples) &&
    existing.difficulty === row.difficulty &&
    existing.bandLevel === row.bandLevel &&
    existing.grammarPattern === row.grammarPattern &&
    JSON.stringify(existing.tags) === JSON.stringify(row.tags) &&
    existing.notes === row.notes &&
    existing.topicSlug === row.topicSlug
  );
}

async function buildChunkImportPlan(
  csvText: string,
  repository: Pick<ChunkImportRepository, "findChunksByKeys">,
): Promise<ChunkImportPlan> {
  const csvValidation = validateChunkCsv(csvText);
  const errors = [...csvValidation.errors];
  const normalizedRows: NormalizedImportRow[] = [];
  const duplicateMap = new Map<string, NormalizedImportRow>();
  let skippedDuplicates = 0;

  csvValidation.rows.forEach((row, index) => {
    const normalized = normalizeImportRow(row, index + 2);
    const existing = duplicateMap.get(normalized.key);

    if (!existing) {
      duplicateMap.set(normalized.key, normalized);
      normalizedRows.push(normalized);
      return;
    }

    if (rowsMatch(existing, normalized)) {
      skippedDuplicates += 1;
      return;
    }

    errors.push({
      rowNumber: normalized.rowNumber,
      message: `Conflicting duplicate chunk also appears in row ${existing.rowNumber}.`,
    });
  });

  if (errors.length > 0) {
    return {
      operations: [],
      summary: {
        totalRows: csvValidation.totalRows,
        created: 0,
        updated: 0,
        skipped: skippedDuplicates,
        errors,
      },
    };
  }

  const existingChunks = await repository.findChunksByKeys(
    normalizedRows.map((row) => ({
      chunk: row.chunk,
      meaningVi: row.meaningVi,
    })),
  );
  const existingByKey = new Map(
    existingChunks.map((chunk) => [buildChunkKey(chunk.chunk, chunk.meaningVi), chunk]),
  );

  const operations = normalizedRows.map<ChunkImportOperation>((row) => {
    const existingChunk = existingByKey.get(row.key);

    if (!existingChunk) {
      return {
        status: "create",
        row,
      };
    }

    if (chunkMatchesRow(existingChunk, row) && !existingChunk.deletedAt) {
      return {
        status: "skip",
        row,
        existingId: existingChunk.id,
      };
    }

    return {
      status: "update",
      row,
      existingId: existingChunk.id,
    };
  });

  return {
    operations,
    summary: {
      totalRows: csvValidation.totalRows,
      created: operations.filter((operation) => operation.status === "create").length,
      updated: operations.filter((operation) => operation.status === "update").length,
      skipped:
        skippedDuplicates +
        operations.filter((operation) => operation.status === "skip").length,
      errors: [],
    },
  };
}

async function ensureTopicsForOperations(
  operations: ChunkImportOperation[],
  transaction: ChunkImportTransaction,
) {
  const topicEntries = operations
    .map((operation) => ({
      topicName: operation.row.topicName,
      topicSlug: operation.row.topicSlug,
    }))
    .filter(
      (entry): entry is { topicName: string; topicSlug: string } =>
        Boolean(entry.topicName && entry.topicSlug),
    );

  const uniqueTopicEntries = [...new Map(
    topicEntries.map((entry) => [entry.topicSlug, entry]),
  ).values()];

  if (uniqueTopicEntries.length === 0) {
    return new Map<string, string>();
  }

  const existingTopics = await transaction.findTopicsBySlugs(
    uniqueTopicEntries.map((entry) => entry.topicSlug),
  );
  const topicIdBySlug = new Map(
    existingTopics.map((topic) => [topic.slug, topic.id]),
  );

  for (const entry of uniqueTopicEntries) {
    if (topicIdBySlug.has(entry.topicSlug)) {
      continue;
    }

    const createdTopic = await transaction.createTopic({
      name: entry.topicName,
      slug: entry.topicSlug,
    });
    topicIdBySlug.set(createdTopic.slug, createdTopic.id);
  }

  return topicIdBySlug;
}

export async function executeChunkImport(options: {
  actorId: string;
  csvText: string;
  dryRun?: boolean;
  repository: ChunkImportRepository;
}) {
  const plan = await buildChunkImportPlan(options.csvText, options.repository);

  if (options.dryRun || plan.summary.errors.length > 0) {
    return {
      dryRun: Boolean(options.dryRun),
      summary: plan.summary,
    };
  }

  await options.repository.transaction(async (transaction) => {
    const topicIdBySlug = await ensureTopicsForOperations(
      plan.operations,
      transaction,
    );

    for (const operation of plan.operations) {
      if (operation.status === "skip") {
        continue;
      }

      await transaction.upsertChunk({
        actorId: options.actorId,
        chunk: operation.row.chunk,
        meaningVi: operation.row.meaningVi,
        example: operation.row.example,
        wrongExamples: operation.row.wrongExamples,
        difficulty: operation.row.difficulty,
        bandLevel: operation.row.bandLevel,
        grammarPattern: operation.row.grammarPattern,
        tags: operation.row.tags,
        notes: operation.row.notes,
        topicId: operation.row.topicSlug
          ? (topicIdBySlug.get(operation.row.topicSlug) ?? null)
          : null,
      });
    }
  });

  return {
    dryRun: false,
    summary: plan.summary,
  };
}
