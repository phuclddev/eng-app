import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NotFoundError } from "@/lib/errors";

const conversationFindFirst = vi.fn();
const chunkFindFirst = vi.fn();
const roleplayFindFirst = vi.fn();
const scenarioFindFirst = vi.fn();
const favoriteUpsert = vi.fn();
const favoriteFindUnique = vi.fn();
const favoriteDelete = vi.fn();
const favoriteFindMany = vi.fn();
const conversationFindMany = vi.fn();
const chunkFindMany = vi.fn();
const roleplayFindMany = vi.fn();
const scenarioFindMany = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyFavorite: {
      upsert: favoriteUpsert,
      findUnique: favoriteFindUnique,
      delete: favoriteDelete,
      findMany: favoriteFindMany,
    },
    familyConversation: {
      findFirst: conversationFindFirst,
      findMany: conversationFindMany,
    },
    familyChunk: {
      findFirst: chunkFindFirst,
      findMany: chunkFindMany,
    },
    familyRoleplaySession: {
      findFirst: roleplayFindFirst,
      findMany: roleplayFindMany,
    },
    familyScenario: {
      findFirst: scenarioFindFirst,
      findMany: scenarioFindMany,
    },
  },
}));

let addFamilyFavorite: typeof import("@/server/family/family-favorites-service").addFamilyFavorite;
let removeFamilyFavorite: typeof import("@/server/family/family-favorites-service").removeFamilyFavorite;
let listFamilyFavoritesForUser: typeof import("@/server/family/family-favorites-service").listFamilyFavoritesForUser;

beforeAll(async () => {
  ({
    addFamilyFavorite,
    removeFamilyFavorite,
    listFamilyFavoritesForUser,
  } = await import("@/server/family/family-favorites-service"));
});

beforeEach(() => {
  conversationFindFirst.mockReset();
  chunkFindFirst.mockReset();
  roleplayFindFirst.mockReset();
  scenarioFindFirst.mockReset();
  favoriteUpsert.mockReset();
  favoriteFindUnique.mockReset();
  favoriteDelete.mockReset();
  favoriteFindMany.mockReset();
  conversationFindMany.mockReset();
  chunkFindMany.mockReset();
  roleplayFindMany.mockReset();
  scenarioFindMany.mockReset();
});

describe("addFamilyFavorite", () => {
  it("rejects targets owned by other users", async () => {
    conversationFindFirst.mockResolvedValueOnce(null);

    await expect(
      addFamilyFavorite({
        userId: "user-1",
        payload: {
          targetType: "CONVERSATION",
          targetId: "conv-other",
          note: null,
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(favoriteUpsert).not.toHaveBeenCalled();
  });

  it("upserts a favorite the user owns", async () => {
    chunkFindFirst.mockResolvedValueOnce({ id: "chunk-1" });
    favoriteUpsert.mockResolvedValueOnce({
      id: "fav-1",
      userId: "user-1",
      targetType: "CHUNK",
      targetId: "chunk-1",
      note: null,
      createdAt: new Date("2026-06-11T12:00:00.000Z"),
    });

    const result = await addFamilyFavorite({
      userId: "user-1",
      payload: { targetType: "CHUNK", targetId: "chunk-1", note: null },
    });

    expect(result.targetType).toBe("CHUNK");
    expect(favoriteUpsert).toHaveBeenCalledTimes(1);
  });
});

describe("removeFamilyFavorite", () => {
  it("returns ok when nothing is favorited", async () => {
    favoriteFindUnique.mockResolvedValueOnce(null);

    const result = await removeFamilyFavorite({
      userId: "user-1",
      payload: { targetType: "CHUNK", targetId: "chunk-1" },
    });

    expect(result.ok).toBe(true);
    expect(favoriteDelete).not.toHaveBeenCalled();
  });

  it("deletes the favorite when it exists", async () => {
    favoriteFindUnique.mockResolvedValueOnce({ id: "fav-1" });

    await removeFamilyFavorite({
      userId: "user-1",
      payload: { targetType: "CHUNK", targetId: "chunk-1" },
    });

    expect(favoriteDelete).toHaveBeenCalledWith({ where: { id: "fav-1" } });
  });
});

describe("listFamilyFavoritesForUser", () => {
  it("returns an empty list when no favorites exist", async () => {
    favoriteFindMany.mockResolvedValueOnce([]);

    const result = await listFamilyFavoritesForUser({ userId: "user-1" });

    expect(result).toEqual([]);
    expect(conversationFindMany).not.toHaveBeenCalled();
  });

  it("attaches labels for chunks and conversations", async () => {
    favoriteFindMany.mockResolvedValueOnce([
      {
        id: "fav-1",
        userId: "user-1",
        targetType: "CHUNK",
        targetId: "chunk-1",
        note: null,
        createdAt: new Date("2026-06-11T12:00:00.000Z"),
      },
      {
        id: "fav-2",
        userId: "user-1",
        targetType: "CONVERSATION",
        targetId: "conv-1",
        note: null,
        createdAt: new Date("2026-06-11T12:00:00.000Z"),
      },
    ]);
    conversationFindMany.mockResolvedValueOnce([
      {
        id: "conv-1",
        title: "Bedtime",
        scenario: { title: "Bedtime routine" },
      },
    ]);
    chunkFindMany.mockResolvedValueOnce([
      { id: "chunk-1", text: "Brush your teeth", meaningVi: "đánh răng" },
    ]);
    roleplayFindMany.mockResolvedValueOnce([]);
    scenarioFindMany.mockResolvedValueOnce([]);

    const result = await listFamilyFavoritesForUser({ userId: "user-1" });

    const chunkFavorite = result.find(
      (favorite) => favorite.targetType === "CHUNK",
    );
    expect(chunkFavorite?.label).toBe("Brush your teeth");
    expect(chunkFavorite?.detail).toBe("đánh răng");

    const conversationFavorite = result.find(
      (favorite) => favorite.targetType === "CONVERSATION",
    );
    expect(conversationFavorite?.label).toBe("Bedtime");
    expect(conversationFavorite?.detail).toBe("Bedtime routine");
  });
});
