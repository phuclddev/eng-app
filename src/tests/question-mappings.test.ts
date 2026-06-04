import { describe, expect, it } from "vitest";

import { questionChunkMappingsFormSchema } from "@/lib/validation";
import { syncQuestionChunkMappings } from "@/server/question-mappings";

function createMappingRepository(options?: {
  activeChunkIds?: string[];
  questionIds?: string[];
  existingMappings?: Array<{
    questionId: string;
    chunkId: string;
    usageRole: string;
    exampleSentence: null | string;
    sortOrder: number;
  }>;
}) {
  let state = {
    activeChunkIds: new Set(options?.activeChunkIds ?? []),
    questionIds: new Set(options?.questionIds ?? []),
    mappings: structuredClone(options?.existingMappings ?? []),
  };

  return {
    repository: {
      async transaction<T>(callback: (transaction: {
        deleteMappings(questionId: string): Promise<void>;
        findActiveChunks(chunkIds: string[]): Promise<Array<{ id: string }>>;
        findQuestion(questionId: string): Promise<{ id: string } | null>;
        insertMappings(
          questionId: string,
          mappings: Array<{
            chunkId: string;
            usageRole: "HOOK" | "MAIN_IDEA" | "SUPPORTING_DETAIL" | "EXAMPLE" | "OPINION" | "CLOSING";
            exampleSentence: null | string;
            sortOrder: number;
          }>,
        ): Promise<void>;
      }) => Promise<T>) {
        const draft = structuredClone({
          activeChunkIds: [...state.activeChunkIds],
          questionIds: [...state.questionIds],
          mappings: state.mappings,
        });

        const result = await callback({
          async findQuestion(questionId) {
            return draft.questionIds.includes(questionId) ? { id: questionId } : null;
          },
          async findActiveChunks(chunkIds) {
            return chunkIds
              .filter((chunkId) => draft.activeChunkIds.includes(chunkId))
              .map((id) => ({ id }));
          },
          async deleteMappings(questionId) {
            draft.mappings = draft.mappings.filter(
              (mapping) => mapping.questionId !== questionId,
            );
          },
          async insertMappings(questionId, mappings) {
            draft.mappings.push(
              ...mappings.map((mapping) => ({
                questionId,
                ...mapping,
              })),
            );
          },
        });

        state = {
          activeChunkIds: new Set(draft.activeChunkIds),
          questionIds: new Set(draft.questionIds),
          mappings: draft.mappings,
        };
        return result;
      },
    },
    readState() {
      return structuredClone({
        activeChunkIds: [...state.activeChunkIds],
        questionIds: [...state.questionIds],
        mappings: state.mappings,
      });
    },
  };
}

describe("questionChunkMappingsFormSchema", () => {
  it("rejects duplicate chunk + usageRole mappings", () => {
    expect(() =>
      questionChunkMappingsFormSchema.parse({
        questionId: "question-1",
        mappings: [
          {
            chunkId: "chunk-1",
            usageRole: "MAIN_IDEA",
            exampleSentence: "One sentence",
          },
          {
            chunkId: "chunk-1",
            usageRole: "MAIN_IDEA",
            exampleSentence: "Duplicate sentence",
          },
        ],
      }),
    ).toThrow("Duplicate chunk and usage role mapping.");
  });
});

describe("syncQuestionChunkMappings", () => {
  it("replaces prior mappings with the new ordered mapping set", async () => {
    const values = questionChunkMappingsFormSchema.parse({
      questionId: "question-1",
      mappings: [
        {
          chunkId: "chunk-1",
          usageRole: "HOOK",
          exampleSentence: "Let me start with...",
        },
        {
          chunkId: "chunk-2",
          usageRole: "EXAMPLE",
          exampleSentence: "For example, I often...",
        },
      ],
    });
    const { repository, readState } = createMappingRepository({
      activeChunkIds: ["chunk-1", "chunk-2"],
      questionIds: ["question-1"],
      existingMappings: [
        {
          questionId: "question-1",
          chunkId: "old-chunk",
          usageRole: "MAIN_IDEA",
          exampleSentence: null,
          sortOrder: 0,
        },
      ],
    });

    await syncQuestionChunkMappings({
      values,
      repository,
    });

    expect(readState().mappings).toEqual([
      {
        questionId: "question-1",
        chunkId: "chunk-1",
        usageRole: "HOOK",
        exampleSentence: "Let me start with...",
        sortOrder: 0,
      },
      {
        questionId: "question-1",
        chunkId: "chunk-2",
        usageRole: "EXAMPLE",
        exampleSentence: "For example, I often...",
        sortOrder: 1,
      },
    ]);
  });

  it("rejects mappings that reference archived or missing chunks", async () => {
    const values = questionChunkMappingsFormSchema.parse({
      questionId: "question-1",
      mappings: [
        {
          chunkId: "chunk-1",
          usageRole: "MAIN_IDEA",
          exampleSentence: "Main answer line",
        },
      ],
    });
    const { repository } = createMappingRepository({
      activeChunkIds: [],
      questionIds: ["question-1"],
    });

    await expect(
      syncQuestionChunkMappings({
        values,
        repository,
      }),
    ).rejects.toThrow("One or more mapped chunks are unavailable or archived.");
  });
});
