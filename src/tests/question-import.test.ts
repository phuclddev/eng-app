import { describe, expect, it } from "vitest";

import { buildQuestionFingerprint } from "@/server/data/questions";
import { executeQuestionImport } from "@/server/question-import";

type MemoryQuestion = {
  difficulty: number;
  fingerprint: string;
  id: string;
  notes: null | string;
  prompt: string;
  skill: "SPEAKING";
  subTopic: null | string;
  supportingPoints: string[];
  targetBand: number;
  taskType: "PART_1" | "PART_2" | "PART_3";
  topic: string;
};

function buildCsv(rows: string[]) {
  return [
    "skill,task_type,topic,sub_topic,difficulty,target_band,prompt,supporting_points,notes",
    ...rows,
  ].join("\n");
}

function createMemoryQuestionImportRepository(
  options?: {
    failOnUpsertAt?: number;
    questions?: MemoryQuestion[];
  },
) {
  let questionSequence = options?.questions?.length ?? 0;
  let state = {
    questions: structuredClone(options?.questions ?? []),
  };

  return {
    repository: {
      async findQuestionsByFingerprints(fingerprints: string[]) {
        const set = new Set(fingerprints);
        return state.questions.filter((question) => set.has(question.fingerprint));
      },
      async transaction<T>(callback: (transaction: {
        upsertQuestion(input: Omit<MemoryQuestion, "id"> & { actorId: string }): Promise<void>;
      }) => Promise<T>) {
        const draft = structuredClone(state);
        let upsertCount = 0;

        const result = await callback({
          async upsertQuestion(input) {
            upsertCount += 1;

            if (options?.failOnUpsertAt === upsertCount) {
              throw new Error("Forced question import failure");
            }

            const existingIndex = draft.questions.findIndex(
              (question) => question.fingerprint === input.fingerprint,
            );

            if (existingIndex >= 0) {
              draft.questions[existingIndex] = {
                ...draft.questions[existingIndex],
                ...input,
                id: draft.questions[existingIndex]!.id,
              };
              return;
            }

            questionSequence += 1;
            draft.questions.push({
              ...input,
              id: `question-${questionSequence}`,
            });
          },
        });

        state = draft;
        return result;
      },
    },
    readState() {
      return structuredClone(state);
    },
  };
}

describe("executeQuestionImport", () => {
  it("imports valid questions and skips exact duplicates inside the same file", async () => {
    const csv = buildCsv([
      '"SPEAKING","PART_1","Hometown","Daily life",1,5.5,"What do you like about your hometown?","",""',
      '"SPEAKING","PART_1","Hometown","Daily life",1,5.5,"What do you like about your hometown?","",""',
      '"SPEAKING","PART_2","Travel","Memorable trip",3,6.5,"Describe a memorable trip you enjoyed.","Where you went | Who you went with | Why it was memorable","Cue card"',
    ]);
    const { repository, readState } = createMemoryQuestionImportRepository();

    const summary = await executeQuestionImport({
      actorId: "admin-1",
      csvText: csv,
      repository,
    });

    expect(summary).toMatchObject({
      totalRows: 3,
      created: 2,
      updated: 0,
      skipped: 1,
      errors: [],
    });
    expect(readState().questions).toHaveLength(2);
    expect(readState().questions[1]?.supportingPoints).toEqual([
      "Where you went",
      "Who you went with",
      "Why it was memorable",
    ]);
  });

  it("updates an existing question when the imported version changes", async () => {
    const existingFingerprint = buildQuestionFingerprint({
      skill: "SPEAKING",
      taskType: "PART_3",
      topic: "Education",
      subTopic: "School change",
      prompt: "How should schools change in the future?",
    });
    const csv = buildCsv([
      '"SPEAKING","PART_3","Education","School change",4,7.0,"How should schools change in the future?","Technology | Teacher training","Updated"',
    ]);
    const { repository, readState } = createMemoryQuestionImportRepository({
      questions: [
        {
          id: "question-1",
          fingerprint: existingFingerprint,
          skill: "SPEAKING",
          taskType: "PART_3",
          topic: "Education",
          subTopic: "School change",
          prompt: "How should schools change in the future?",
          supportingPoints: ["Technology"],
          difficulty: 2,
          targetBand: 6,
          notes: null,
        },
      ],
    });

    const summary = await executeQuestionImport({
      actorId: "admin-1",
      csvText: csv,
      repository,
    });

    expect(summary).toMatchObject({
      totalRows: 1,
      created: 0,
      updated: 1,
      skipped: 0,
      errors: [],
    });
    expect(readState().questions[0]).toMatchObject({
      difficulty: 4,
      targetBand: 7,
      notes: "Updated",
      supportingPoints: ["Technology", "Teacher training"],
    });
  });

  it("returns validation errors and does not write anything when any row is invalid", async () => {
    const csv = buildCsv([
      '"SPEAKING","PART_1","Work","Routine",1,5.0,"Do you work or study?","",""',
      '"SPEAKING","PART_9","Work","Routine",9,10.0,"Bad question","",""',
    ]);
    const { repository, readState } = createMemoryQuestionImportRepository();

    const summary = await executeQuestionImport({
      actorId: "admin-1",
      csvText: csv,
      repository,
    });

    expect(summary.created).toBe(0);
    expect(summary.updated).toBe(0);
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(readState().questions).toHaveLength(0);
  });

  it("rolls back the whole import when the transaction fails mid-run", async () => {
    const csv = buildCsv([
      '"SPEAKING","PART_1","Food","Cooking",1,5.0,"Do you enjoy cooking?","",""',
      '"SPEAKING","PART_3","Food","Restaurants",3,6.5,"How has eating out changed recently?","",""',
    ]);
    const { repository, readState } = createMemoryQuestionImportRepository({
      failOnUpsertAt: 2,
    });

    await expect(
      executeQuestionImport({
        actorId: "admin-1",
        csvText: csv,
        repository,
      }),
    ).rejects.toThrow("Forced question import failure");

    expect(readState().questions).toHaveLength(0);
  });
});
