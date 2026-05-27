import type { UserRole, UserStatus } from "@/lib/types";
import type { TopicOption } from "@/lib/types";
import { prisma } from "@/server/prisma";

export type AdminUserRecord = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  notes: string | null;
  createdAt: string;
};

export async function getAdminUsers() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      notes: true,
      createdAt: true,
    },
  });

  return users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  })) satisfies AdminUserRecord[];
}

export async function updateUserModeration(input: {
  userId: string;
  status: UserStatus;
  role?: UserRole;
  notes?: string;
}) {
  const now = new Date();

  return prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      status: input.status,
      role: input.role,
      notes: input.notes,
      approvedAt: input.status === "APPROVED" ? now : null,
      blockedAt: input.status === "BLOCKED" ? now : null,
    },
  });
}

export async function getAdminSnapshot() {
  const [users, topics] = await Promise.all([
    getAdminUsers(),
    prisma.topic.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    }),
  ]);

  return {
    users,
    topics: topics.map(
      (topic) =>
        ({
          id: topic.id,
          name: topic.name,
          slug: topic.slug,
          color: topic.color,
          description: topic.description,
          chunkCount: topic._count.chunks,
        }) satisfies TopicOption,
    ),
  };
}
