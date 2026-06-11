import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  FamilyFavoriteRecord,
  FamilyFavoriteTargetType,
} from "@/lib/types";
import type {
  FamilyFavoriteRemovePayload,
  FamilyFavoriteTogglePayload,
} from "@/lib/validation";
import { prisma } from "@/server/prisma";

type FavoriteRow = {
  id: string;
  userId: string;
  targetType: FamilyFavoriteTargetType;
  targetId: string;
  note: string | null;
  createdAt: Date;
};

async function assertTargetOwnership(input: {
  userId: string;
  targetType: FamilyFavoriteTargetType;
  targetId: string;
}) {
  switch (input.targetType) {
    case "CONVERSATION": {
      const existing = await prisma.familyConversation.findFirst({
        where: { id: input.targetId, userId: input.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundError("Family conversation was not found.");
      }
      return;
    }
    case "CHUNK": {
      const existing = await prisma.familyChunk.findFirst({
        where: { id: input.targetId, userId: input.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundError("Family chunk was not found.");
      }
      return;
    }
    case "ROLEPLAY": {
      const existing = await prisma.familyRoleplaySession.findFirst({
        where: { id: input.targetId, userId: input.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundError("Family roleplay session was not found.");
      }
      return;
    }
    case "SCENARIO": {
      const existing = await prisma.familyScenario.findFirst({
        where: { id: input.targetId, userId: input.userId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundError("Family scenario was not found.");
      }
      return;
    }
    default: {
      throw new ValidationError("Unsupported favorite target type.");
    }
  }
}

function mapBase(favorite: FavoriteRow): FamilyFavoriteRecord {
  return {
    id: favorite.id,
    userId: favorite.userId,
    targetType: favorite.targetType,
    targetId: favorite.targetId,
    note: favorite.note,
    createdAt: favorite.createdAt.toISOString(),
    label: null,
    detail: null,
  };
}

export async function addFamilyFavorite(input: {
  userId: string;
  payload: FamilyFavoriteTogglePayload;
}): Promise<FamilyFavoriteRecord> {
  await assertTargetOwnership({
    userId: input.userId,
    targetType: input.payload.targetType,
    targetId: input.payload.targetId,
  });

  const favorite = await prisma.familyFavorite.upsert({
    where: {
      userId_targetType_targetId: {
        userId: input.userId,
        targetType: input.payload.targetType,
        targetId: input.payload.targetId,
      },
    },
    create: {
      userId: input.userId,
      targetType: input.payload.targetType,
      targetId: input.payload.targetId,
      note: input.payload.note ?? null,
    },
    update: {
      note: input.payload.note ?? null,
    },
  });

  return mapBase(favorite);
}

export async function removeFamilyFavorite(input: {
  userId: string;
  payload: FamilyFavoriteRemovePayload;
}): Promise<{ ok: boolean }> {
  const existing = await prisma.familyFavorite.findUnique({
    where: {
      userId_targetType_targetId: {
        userId: input.userId,
        targetType: input.payload.targetType,
        targetId: input.payload.targetId,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return { ok: true };
  }

  await prisma.familyFavorite.delete({
    where: { id: existing.id },
  });

  return { ok: true };
}

export async function listFamilyFavoritesForUser(input: {
  userId: string;
}): Promise<FamilyFavoriteRecord[]> {
  const favorites = (await prisma.familyFavorite.findMany({
    where: { userId: input.userId },
    orderBy: { createdAt: "desc" },
  })) as FavoriteRow[];

  if (favorites.length === 0) {
    return [];
  }

  const idsByType: Record<FamilyFavoriteTargetType, string[]> = {
    CONVERSATION: [],
    CHUNK: [],
    ROLEPLAY: [],
    SCENARIO: [],
  };

  for (const favorite of favorites) {
    idsByType[favorite.targetType].push(favorite.targetId);
  }

  const [conversations, chunks, roleplays, scenarios] = await Promise.all([
    idsByType.CONVERSATION.length === 0
      ? Promise.resolve([])
      : prisma.familyConversation.findMany({
          where: {
            userId: input.userId,
            id: { in: idsByType.CONVERSATION },
          },
          include: {
            scenario: { select: { title: true } },
          },
        }),
    idsByType.CHUNK.length === 0
      ? Promise.resolve([])
      : prisma.familyChunk.findMany({
          where: {
            userId: input.userId,
            id: { in: idsByType.CHUNK },
          },
        }),
    idsByType.ROLEPLAY.length === 0
      ? Promise.resolve([])
      : prisma.familyRoleplaySession.findMany({
          where: {
            userId: input.userId,
            id: { in: idsByType.ROLEPLAY },
          },
          include: {
            scenario: { select: { title: true } },
          },
        }),
    idsByType.SCENARIO.length === 0
      ? Promise.resolve([])
      : prisma.familyScenario.findMany({
          where: {
            userId: input.userId,
            id: { in: idsByType.SCENARIO },
          },
        }),
  ]);

  const conversationById = new Map(
    conversations.map((conversation) => [conversation.id, conversation]),
  );
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const roleplayById = new Map(
    roleplays.map((roleplay) => [roleplay.id, roleplay]),
  );
  const scenarioById = new Map(
    scenarios.map((scenario) => [scenario.id, scenario]),
  );

  return favorites.map((favorite) => {
    let label: string | null = null;
    let detail: string | null = null;

    if (favorite.targetType === "CONVERSATION") {
      const target = conversationById.get(favorite.targetId);
      if (target) {
        label = target.title;
        detail = target.scenario.title;
      }
    } else if (favorite.targetType === "CHUNK") {
      const target = chunkById.get(favorite.targetId);
      if (target) {
        label = target.text;
        detail = target.meaningVi;
      }
    } else if (favorite.targetType === "ROLEPLAY") {
      const target = roleplayById.get(favorite.targetId);
      if (target) {
        label = target.title;
        detail = target.scenario?.title ?? null;
      }
    } else if (favorite.targetType === "SCENARIO") {
      const target = scenarioById.get(favorite.targetId);
      if (target) {
        label = target.title;
        detail = target.category;
      }
    }

    return {
      ...mapBase(favorite),
      label,
      detail,
    };
  });
}

export async function getFamilyFavoriteIdsForUser(input: {
  userId: string;
  targetType: FamilyFavoriteTargetType;
}): Promise<Set<string>> {
  const favorites = await prisma.familyFavorite.findMany({
    where: {
      userId: input.userId,
      targetType: input.targetType,
    },
    select: { targetId: true },
  });

  return new Set(favorites.map((favorite) => favorite.targetId));
}
