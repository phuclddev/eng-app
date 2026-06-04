import { ValidationError } from "@/lib/errors";
import type { QuestionChunkMappingsFormValues } from "@/lib/validation";
import { prisma } from "@/server/prisma";

type QuestionMappingTransaction = {
  deleteMappings(questionId: string): Promise<void>;
  findActiveChunks(chunkIds: string[]): Promise<Array<{ id: string }>>;
  findQuestion(questionId: string): Promise<{ id: string } | null>;
  insertMappings(
    questionId: string,
    mappings: QuestionChunkMappingsFormValues["mappings"],
  ): Promise<void>;
};

type QuestionMappingRepository = {
  transaction<T>(
    callback: (transaction: QuestionMappingTransaction) => Promise<T>,
  ): Promise<T>;
};

export async function syncQuestionChunkMappings(options: {
  repository: QuestionMappingRepository;
  values: QuestionChunkMappingsFormValues;
}) {
  const chunkIds = [...new Set(options.values.mappings.map((mapping) => mapping.chunkId))];

  await options.repository.transaction(async (transaction) => {
    const question = await transaction.findQuestion(options.values.questionId);

    if (!question) {
      throw new ValidationError("Question not found.");
    }

    if (chunkIds.length > 0) {
      const activeChunks = await transaction.findActiveChunks(chunkIds);

      if (activeChunks.length !== chunkIds.length) {
        throw new ValidationError(
          "One or more mapped chunks are unavailable or archived.",
        );
      }
    }

    await transaction.deleteMappings(options.values.questionId);
    await transaction.insertMappings(options.values.questionId, options.values.mappings);
  });
}

export async function saveQuestionChunkMappings(
  values: QuestionChunkMappingsFormValues,
) {
  return syncQuestionChunkMappings({
    values,
    repository: {
      async transaction(callback) {
        return prisma.$transaction(async (transaction) =>
          callback({
            async findQuestion(questionId) {
              return transaction.ieltsQuestion.findUnique({
                where: {
                  id: questionId,
                },
                select: {
                  id: true,
                },
              });
            },
            async findActiveChunks(chunkIds) {
              return transaction.chunk.findMany({
                where: {
                  id: {
                    in: chunkIds,
                  },
                  deletedAt: null,
                },
                select: {
                  id: true,
                },
              });
            },
            async deleteMappings(questionId) {
              await transaction.ieltsQuestionChunkMapping.deleteMany({
                where: {
                  questionId,
                },
              });
            },
            async insertMappings(questionId, mappings) {
              if (mappings.length === 0) {
                return;
              }

              await transaction.ieltsQuestionChunkMapping.createMany({
                data: mappings.map((mapping) => ({
                  questionId,
                  chunkId: mapping.chunkId,
                  usageRole: mapping.usageRole,
                  exampleSentence: mapping.exampleSentence,
                  sortOrder: mapping.sortOrder,
                })),
              });
            },
          }),
        );
      },
    },
  });
}
