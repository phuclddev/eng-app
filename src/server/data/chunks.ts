import type { Prisma } from "@prisma/client";

import type { ChunkRecord, TopicOption } from "@/lib/types";
import type { ChunkFormValues, TopicFormValues } from "@/lib/validation";
import { slugify, toStringArray } from "@/lib/utils";
import { prisma } from "@/server/prisma";

type ChunkQueryResult = Awaited<ReturnType<typeof getChunkEntities>>[number];

async function getChunkEntities(userId?: string) {
  return prisma.chunk.findMany({
    where: {
      deletedAt: null,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      topic: true,
      reviewSchedules: userId
        ? {
            where: { userId },
            take: 1,
            orderBy: {
              updatedAt: "desc",
            },
          }
        : undefined,
    },
  });
}

export function mapTopic(topic: {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  description: string | null;
  _count?: { chunks: number };
}): TopicOption {
  return {
    id: topic.id,
    name: topic.name,
    slug: topic.slug,
    color: topic.color,
    description: topic.description,
    chunkCount: topic._count?.chunks,
  };
}

export function mapChunkRecord(chunk: ChunkQueryResult): ChunkRecord {
  const review = chunk.reviewSchedules?.[0];

  return {
    id: chunk.id,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    wrongExamples: toStringArray(chunk.wrongExamples),
    difficulty: chunk.difficulty,
    bandLevel: chunk.bandLevel,
    grammarPattern: chunk.grammarPattern,
    tags: toStringArray(chunk.tags),
    notes: chunk.notes,
    topic: chunk.topic ? mapTopic(chunk.topic) : null,
    createdAt: chunk.createdAt.toISOString(),
    updatedAt: chunk.updatedAt.toISOString(),
    review: review
      ? {
          nextReviewAt: review.nextReviewAt.toISOString(),
          intervalDays: review.intervalDays,
          masteryScore: review.masteryScore,
          reviewCount: review.reviewCount,
        }
      : null,
  };
}

export async function getChunkLibrary(userId?: string) {
  const chunks = await getChunkEntities(userId);
  return chunks.map(mapChunkRecord);
}

export async function getChunkById(id: string, userId?: string) {
  const chunk = await prisma.chunk.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      topic: true,
      reviewSchedules: userId
        ? {
            where: { userId },
            take: 1,
            orderBy: {
              updatedAt: "desc",
            },
          }
        : undefined,
    },
  });

  return chunk ? mapChunkRecord(chunk) : null;
}

export async function getTopicOptions() {
  const topics = await prisma.topic.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      chunks: {
        select: {
          id: true,
        },
        where: {
          deletedAt: null,
        },
      },
    },
  });

  return topics.map((topic) =>
    mapTopic({
      id: topic.id,
      name: topic.name,
      slug: topic.slug,
      color: topic.color,
      description: topic.description,
      _count: {
        chunks: topic.chunks.length,
      },
    }),
  );
}

export async function ensureTopicByName(name: string) {
  const slug = slugify(name);
  const existing = await prisma.topic.findUnique({
    where: {
      slug,
    },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.topic.create({
    data: {
      name,
      slug,
    },
  });

  return created.id;
}

export async function saveTopic(values: TopicFormValues) {
  const payload = {
    name: values.name,
    slug: slugify(values.name),
    color: values.color ? values.color : null,
    description: values.description ? values.description : null,
  };

  if (values.id) {
    return prisma.topic.update({
      where: {
        id: values.id,
      },
      data: payload,
    });
  }

  return prisma.topic.create({
    data: payload,
  });
}

export async function saveChunk(values: ChunkFormValues, actorId: string) {
  const payload = {
    chunk: values.chunk,
    meaningVi: values.meaningVi,
    example: values.example,
    wrongExamples: values.wrongExamples as Prisma.InputJsonValue,
    difficulty: values.difficulty,
    bandLevel: values.bandLevel,
    grammarPattern: values.grammarPattern,
    tags: values.tags as Prisma.InputJsonValue,
    notes: values.notes,
    topicId: values.topicId,
    deletedAt: null,
  };

  if (values.id) {
    return prisma.chunk.update({
      where: {
        id: values.id,
      },
      data: payload,
    });
  }

  return prisma.chunk.create({
    data: {
      ...payload,
      createdById: actorId,
    },
  });
}

export async function removeChunk(id: string) {
  return prisma.chunk.update({
    where: {
      id,
    },
    data: {
      deletedAt: new Date(),
    },
  });
}
