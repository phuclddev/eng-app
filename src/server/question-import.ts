import { prisma } from "@/server/prisma";
import { buildQuestionFingerprint } from "@/server/data/questions";
import { validateQuestionCsv } from "@/lib/csv";
import { toStringArray } from "@/lib/utils";

type ExistingQuestionSnapshot = {
  difficulty: number;
  fingerprint: string;
  id: string;
  notes: null | string;
  prompt: string;
  skill: string;
  subTopic: null | string;
  supportingPoints: unknown;
  targetBand: number;
  taskType: string;
  topic: string;
};

type PersistQuestionInput = {
  actorId: string;
  difficulty: number;
  fingerprint: string;
  notes: null | string;
  prompt: string;
  skill: "SPEAKING";
  subTopic: null | string;
  supportingPoints: string[];
  targetBand: number;
  taskType: "PART_1" | "PART_2" | "PART_3";
  topic: string;
};

type QuestionImportTransaction = {
  upsertQuestion(input: PersistQuestionInput): Promise<void>;
};

type QuestionImportRepository = {
  findQuestionsByFingerprints(
    fingerprints: string[],
  ): Promise<ExistingQuestionSnapshot[]>;
  transaction<T>(
    callback: (transaction: QuestionImportTransaction) => Promise<T>,
  ): Promise<T>;
};

export type QuestionImportError = {
  message: string;
  rowNumber?: number;
};

export type QuestionImportSummary = {
  created: number;
  errors: QuestionImportError[];
  skipped: number;
  totalRows: number;
  updated: number;
};

type NormalizedQuestionRow = {
  difficulty: number;
  fingerprint: string;
  key: string;
  notes: null | string;
  prompt: string;
  rowNumber: number;
  skill: "SPEAKING";
  subTopic: null | string;
  supportingPoints: string[];
  targetBand: number;
  taskType: "PART_1" | "PART_2" | "PART_3";
  topic: string;
};

type QuestionImportOperation =
  | { row: NormalizedQuestionRow; status: "create" }
  | { existingId: string; row: NormalizedQuestionRow; status: "update" }
  | { existingId: string; row: NormalizedQuestionRow; status: "skip" };

function normalizeQuestionRow(
  row: ReturnType<typeof validateQuestionCsv>["rows"][number],
  rowNumber: number,
): NormalizedQuestionRow {
  const subTopic = row.sub_topic ? row.sub_topic.trim() : "";
  const supportingPoints = row.supporting_points
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const normalized = {
    rowNumber,
    skill: row.skill,
    taskType: row.task_type,
    topic: row.topic,
    subTopic: subTopic || null,
    prompt: row.prompt,
    supportingPoints,
    difficulty: row.difficulty,
    targetBand: row.target_band,
    notes: row.notes || null,
  } satisfies Omit<NormalizedQuestionRow, "fingerprint" | "key">;
  const fingerprint = buildQuestionFingerprint(normalized);

  return {
    ...normalized,
    fingerprint,
    key: fingerprint,
  };
}

function rowsMatch(left: NormalizedQuestionRow, right: NormalizedQuestionRow) {
  return (
    left.skill === right.skill &&
    left.taskType === right.taskType &&
    left.topic === right.topic &&
    left.subTopic === right.subTopic &&
    left.prompt === right.prompt &&
    JSON.stringify(left.supportingPoints) ===
      JSON.stringify(right.supportingPoints) &&
    left.difficulty === right.difficulty &&
    left.targetBand === right.targetBand &&
    left.notes === right.notes
  );
}

function questionMatchesRow(
  existing: ExistingQuestionSnapshot,
  row: NormalizedQuestionRow,
) {
  return (
    existing.skill === row.skill &&
    existing.taskType === row.taskType &&
    existing.topic === row.topic &&
    existing.subTopic === row.subTopic &&
    existing.prompt === row.prompt &&
    JSON.stringify(toStringArray(existing.supportingPoints)) ===
      JSON.stringify(row.supportingPoints) &&
    existing.difficulty === row.difficulty &&
    existing.targetBand === row.targetBand &&
    existing.notes === row.notes
  );
}

async function buildQuestionImportPlan(
  csvText: string,
  repository: Pick<QuestionImportRepository, "findQuestionsByFingerprints">,
) {
  const validation = validateQuestionCsv(csvText);
  const errors = [...validation.errors];
  const normalizedRows: NormalizedQuestionRow[] = [];
  const duplicateMap = new Map<string, NormalizedQuestionRow>();
  let skippedDuplicates = 0;

  validation.rows.forEach((row, index) => {
    const normalized = normalizeQuestionRow(row, index + 2);
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
      message: `Conflicting duplicate question also appears in row ${existing.rowNumber}.`,
    });
  });

  if (errors.length > 0) {
    return {
      operations: [] as QuestionImportOperation[],
      summary: {
        totalRows: validation.totalRows,
        created: 0,
        updated: 0,
        skipped: skippedDuplicates,
        errors,
      },
    };
  }

  const existingQuestions = await repository.findQuestionsByFingerprints(
    normalizedRows.map((row) => row.fingerprint),
  );
  const existingByFingerprint = new Map(
    existingQuestions.map((question) => [question.fingerprint, question]),
  );

  const operations = normalizedRows.map<QuestionImportOperation>((row) => {
    const existing = existingByFingerprint.get(row.fingerprint);

    if (!existing) {
      return {
        row,
        status: "create",
      };
    }

    if (questionMatchesRow(existing, row)) {
      return {
        existingId: existing.id,
        row,
        status: "skip",
      };
    }

    return {
      existingId: existing.id,
      row,
      status: "update",
    };
  });

  return {
    operations,
    summary: {
      totalRows: validation.totalRows,
      created: operations.filter((operation) => operation.status === "create").length,
      updated: operations.filter((operation) => operation.status === "update").length,
      skipped:
        skippedDuplicates +
        operations.filter((operation) => operation.status === "skip").length,
      errors: [],
    },
  };
}

export async function executeQuestionImport(options: {
  actorId: string;
  csvText: string;
  repository: QuestionImportRepository;
}) {
  const plan = await buildQuestionImportPlan(options.csvText, options.repository);

  if (plan.summary.errors.length > 0) {
    return plan.summary;
  }

  await options.repository.transaction(async (transaction) => {
    for (const operation of plan.operations) {
      if (operation.status === "skip") {
        continue;
      }

      await transaction.upsertQuestion({
        actorId: options.actorId,
        skill: operation.row.skill,
        taskType: operation.row.taskType,
        topic: operation.row.topic,
        subTopic: operation.row.subTopic,
        prompt: operation.row.prompt,
        supportingPoints: operation.row.supportingPoints,
        difficulty: operation.row.difficulty,
        targetBand: operation.row.targetBand,
        notes: operation.row.notes,
        fingerprint: operation.row.fingerprint,
      });
    }
  });

  return plan.summary;
}

export async function importQuestionsFromCsv(options: {
  actorId: string;
  csvText: string;
}) {
  return executeQuestionImport({
    actorId: options.actorId,
    csvText: options.csvText,
    repository: {
      async findQuestionsByFingerprints(fingerprints) {
        if (fingerprints.length === 0) {
          return [];
        }

        return prisma.ieltsQuestion.findMany({
          where: {
            fingerprint: {
              in: fingerprints,
            },
          },
          select: {
            id: true,
            fingerprint: true,
            skill: true,
            taskType: true,
            topic: true,
            subTopic: true,
            prompt: true,
            supportingPoints: true,
            difficulty: true,
            targetBand: true,
            notes: true,
          },
        });
      },
      async transaction(callback) {
        return prisma.$transaction(async (transaction) =>
          callback({
            async upsertQuestion(input) {
              await transaction.ieltsQuestion.upsert({
                where: {
                  fingerprint: input.fingerprint,
                },
                create: {
                  skill: input.skill,
                  taskType: input.taskType,
                  topic: input.topic,
                  subTopic: input.subTopic,
                  prompt: input.prompt,
                  supportingPoints: input.supportingPoints,
                  difficulty: input.difficulty,
                  targetBand: input.targetBand,
                  notes: input.notes,
                  fingerprint: input.fingerprint,
                  createdById: input.actorId,
                },
                update: {
                  skill: input.skill,
                  taskType: input.taskType,
                  topic: input.topic,
                  subTopic: input.subTopic,
                  prompt: input.prompt,
                  supportingPoints: input.supportingPoints,
                  difficulty: input.difficulty,
                  targetBand: input.targetBand,
                  notes: input.notes,
                },
              });
            },
          }),
        );
      },
    },
  });
}
