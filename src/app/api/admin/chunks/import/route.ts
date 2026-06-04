import { NextResponse } from "next/server";

import { executeChunkImport } from "@/server/chunk-import";
import { getErrorResponse } from "@/lib/errors";
import { requireAdminApiSession } from "@/server/auth";
import { prisma } from "@/server/prisma";

export async function POST(request: Request) {
  try {
    const session = await requireAdminApiSession();
    const formData = await request.formData();
    const file = formData.get("file");
    const dryRun = formData.get("dryRun") === "true";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "FILE_REQUIRED", message: "A CSV file is required." },
        { status: 400 },
      );
    }

    const csvText = await file.text();
    const result = await executeChunkImport({
      actorId: session.user.id,
      csvText,
      dryRun,
      repository: {
        async findChunksByKeys(keys) {
          if (keys.length === 0) {
            return [];
          }

          const chunks = await prisma.chunk.findMany({
            where: {
              OR: keys.map((key) => ({
                chunk: key.chunk,
                meaningVi: key.meaningVi,
              })),
            },
            include: {
              topic: {
                select: {
                  slug: true,
                },
              },
            },
          });

          return chunks.map((chunk) => ({
            id: chunk.id,
            chunk: chunk.chunk,
            meaningVi: chunk.meaningVi,
            example: chunk.example,
            wrongExamples: chunk.wrongExamples,
            difficulty: chunk.difficulty,
            bandLevel: chunk.bandLevel,
            grammarPattern: chunk.grammarPattern,
            tags: chunk.tags,
            notes: chunk.notes,
            topicSlug: chunk.topic?.slug ?? null,
            deletedAt: chunk.deletedAt,
          }));
        },
        async findTopicsBySlugs(slugs) {
          if (slugs.length === 0) {
            return [];
          }

          return prisma.topic.findMany({
            where: {
              slug: {
                in: slugs,
              },
            },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });
        },
        async transaction(callback) {
          return prisma.$transaction(async (transaction) =>
            callback({
              async createTopic(topic) {
                return transaction.topic.create({
                  data: topic,
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                });
              },
              async findTopicsBySlugs(slugs) {
                if (slugs.length === 0) {
                  return [];
                }

                return transaction.topic.findMany({
                  where: {
                    slug: {
                      in: slugs,
                    },
                  },
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                });
              },
              async upsertChunk(input) {
                await transaction.chunk.upsert({
                  where: {
                    chunk_meaningVi: {
                      chunk: input.chunk,
                      meaningVi: input.meaningVi,
                    },
                  },
                  create: {
                    chunk: input.chunk,
                    meaningVi: input.meaningVi,
                    example: input.example,
                    wrongExamples: input.wrongExamples,
                    difficulty: input.difficulty,
                    bandLevel: input.bandLevel,
                    grammarPattern: input.grammarPattern,
                    tags: input.tags,
                    notes: input.notes,
                    topicId: input.topicId,
                    createdById: input.actorId,
                    deletedAt: null,
                  },
                  update: {
                    example: input.example,
                    wrongExamples: input.wrongExamples,
                    difficulty: input.difficulty,
                    bandLevel: input.bandLevel,
                    grammarPattern: input.grammarPattern,
                    tags: input.tags,
                    notes: input.notes,
                    topicId: input.topicId,
                    deletedAt: null,
                  },
                });
              },
            }),
          );
        },
      },
    });

    if (result.summary.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          dryRun: result.dryRun,
          summary: result.summary,
          message: "Import validation failed.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      dryRun: result.dryRun,
      summary: result.summary,
    });
  } catch (error) {
    const { status, body } = getErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
