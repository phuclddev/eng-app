import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "@/lib/errors";
import { familyScenarioFormSchema } from "@/lib/validation";

const findMany = vi.fn();
const findFirst = vi.fn();
const count = vi.fn();
const create = vi.fn();
const update = vi.fn();
const updateMany = vi.fn();
const upsert = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyScenario: {
      findMany,
      findFirst,
      count,
      create,
      update,
      updateMany,
      upsert,
    },
  },
}));

let ensureDefaultFamilyScenariosForUser: typeof import("@/server/family/family-scenario-service").ensureDefaultFamilyScenariosForUser;
let getFamilyScenarioByIdForUser: typeof import("@/server/family/family-scenario-service").getFamilyScenarioByIdForUser;
let saveFamilyScenario: typeof import("@/server/family/family-scenario-service").saveFamilyScenario;
let setFamilyScenarioStatus: typeof import("@/server/family/family-scenario-service").setFamilyScenarioStatus;
let bulkSetFamilyScenarioStatus: typeof import("@/server/family/family-scenario-service").bulkSetFamilyScenarioStatus;

beforeAll(async () => {
  ({
    ensureDefaultFamilyScenariosForUser,
    getFamilyScenarioByIdForUser,
    saveFamilyScenario,
    setFamilyScenarioStatus,
    bulkSetFamilyScenarioStatus,
  } = await import("@/server/family/family-scenario-service"));
});

describe("family scenario service", () => {
  beforeEach(() => {
    findMany.mockReset();
    findFirst.mockReset();
    count.mockReset();
    create.mockReset();
    update.mockReset();
    updateMany.mockReset();
    upsert.mockReset();
  });

  it("validates scenario form data before saving", () => {
    expect(() =>
      familyScenarioFormSchema.parse({
        title: "A",
        category: "Bedtime",
        childFocus: "BOTH",
        description: "short",
        difficulty: 8,
      }),
    ).toThrow();
  });

  it("seeds bootstrap-owner default scenarios idempotently", async () => {
    await ensureDefaultFamilyScenariosForUser({
      userId: "user-1",
      email: "dinhphuc.luu@garena.vn",
    });

    expect(upsert).toHaveBeenCalled();
    expect(upsert.mock.calls.length).toBeGreaterThanOrEqual(10);
  });

  it("does not seed Phuc-specific defaults for unrelated users", async () => {
    const seeded = await ensureDefaultFamilyScenariosForUser({
      userId: "user-2",
      email: "other@example.com",
    });

    expect(seeded).toEqual([]);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("prevents users from loading scenarios they do not own", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      getFamilyScenarioByIdForUser({
        userId: "user-1",
        scenarioId: "scenario-1",
        email: "other@example.com",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  it("blocks duplicate scenario titles for the same owner", async () => {
    findFirst.mockResolvedValueOnce({
      id: "existing-scenario",
    });

    await expect(
      saveFamilyScenario({
        userId: "user-1",
        email: "other@example.com",
        values: {
          title: "Bedtime struggle",
          category: "Bedtime",
          childFocus: "BOTH",
          description: "A realistic bedtime struggle with excuses and delays.",
          difficulty: 3,
          isActive: true,
          status: "APPROVED",
        },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("transitions a scenario status to APPROVED with isActive true", async () => {
    findMany.mockResolvedValueOnce([]);
    findFirst.mockResolvedValueOnce({
      id: "scenario-1",
      userId: "user-1",
      title: "Bedtime struggle",
      category: "Bedtime",
      childFocus: "BOTH",
      description: "Description",
      difficulty: 2,
      isActive: false,
      status: "SUGGESTED",
      source: "AI",
      aiReason: null,
      suggestedGoals: [],
      suggestedChunks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    update.mockResolvedValueOnce({
      id: "scenario-1",
      userId: "user-1",
      title: "Bedtime struggle",
      category: "Bedtime",
      childFocus: "BOTH",
      description: "Description",
      difficulty: 2,
      isActive: true,
      status: "APPROVED",
      source: "AI",
      aiReason: null,
      suggestedGoals: [],
      suggestedChunks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await setFamilyScenarioStatus({
      userId: "user-1",
      scenarioId: "scenario-1",
      status: "APPROVED",
    });

    expect(result.status).toBe("APPROVED");
    expect(result.isActive).toBe(true);
    const updateArgs = update.mock.calls[0][0];
    expect(updateArgs.data.isActive).toBe(true);
    expect(updateArgs.data.status).toBe("APPROVED");
  });

  it("flips ownership-checked scenario to ARCHIVED with isActive false", async () => {
    findMany.mockResolvedValueOnce([]);
    findFirst.mockResolvedValueOnce({
      id: "scenario-1",
      userId: "user-1",
      title: "Bedtime struggle",
      category: "Bedtime",
      childFocus: "BOTH",
      description: "Description",
      difficulty: 2,
      isActive: true,
      status: "APPROVED",
      source: "AI",
      aiReason: null,
      suggestedGoals: [],
      suggestedChunks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    update.mockResolvedValueOnce({
      id: "scenario-1",
      userId: "user-1",
      title: "Bedtime struggle",
      category: "Bedtime",
      childFocus: "BOTH",
      description: "Description",
      difficulty: 2,
      isActive: false,
      status: "ARCHIVED",
      source: "AI",
      aiReason: null,
      suggestedGoals: [],
      suggestedChunks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await setFamilyScenarioStatus({
      userId: "user-1",
      scenarioId: "scenario-1",
      status: "ARCHIVED",
    });

    expect(result.status).toBe("ARCHIVED");
    expect(result.isActive).toBe(false);
  });

  it("bulk approve rejects when not every id belongs to the user", async () => {
    findMany.mockResolvedValueOnce([{ id: "scenario-1" }]);

    await expect(
      bulkSetFamilyScenarioStatus({
        userId: "user-1",
        scenarioIds: ["scenario-1", "scenario-other"],
        status: "APPROVED",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("bulk approve flips owned scenarios to APPROVED", async () => {
    findMany
      .mockResolvedValueOnce([{ id: "scenario-1" }, { id: "scenario-2" }])
      .mockResolvedValueOnce([
        {
          id: "scenario-1",
          userId: "user-1",
          title: "Scenario 1",
          category: "Bedtime",
          childFocus: "BOTH",
          description: "Description",
          difficulty: 2,
          isActive: true,
          status: "APPROVED",
          source: "AI",
          aiReason: null,
          suggestedGoals: [],
          suggestedChunks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "scenario-2",
          userId: "user-1",
          title: "Scenario 2",
          category: "Meals",
          childFocus: "KIWI",
          description: "Description 2",
          difficulty: 2,
          isActive: true,
          status: "APPROVED",
          source: "AI",
          aiReason: null,
          suggestedGoals: [],
          suggestedChunks: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    updateMany.mockResolvedValueOnce({ count: 2 });

    const result = await bulkSetFamilyScenarioStatus({
      userId: "user-1",
      scenarioIds: ["scenario-1", "scenario-2"],
      status: "APPROVED",
    });

    expect(result).toHaveLength(2);
    expect(updateMany).toHaveBeenCalledTimes(1);
    const args = updateMany.mock.calls[0][0];
    expect(args.data.status).toBe("APPROVED");
    expect(args.data.isActive).toBe(true);
  });
});
