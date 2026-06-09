import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationError } from "@/lib/errors";
import { familyScenarioFormSchema } from "@/lib/validation";

const findMany = vi.fn();
const findFirst = vi.fn();
const count = vi.fn();
const create = vi.fn();
const update = vi.fn();
const upsert = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    familyScenario: {
      findMany,
      findFirst,
      count,
      create,
      update,
      upsert,
    },
  },
}));

let ensureDefaultFamilyScenariosForUser: typeof import("@/server/family/family-scenario-service").ensureDefaultFamilyScenariosForUser;
let getFamilyScenarioByIdForUser: typeof import("@/server/family/family-scenario-service").getFamilyScenarioByIdForUser;
let saveFamilyScenario: typeof import("@/server/family/family-scenario-service").saveFamilyScenario;

beforeAll(async () => {
  ({
    ensureDefaultFamilyScenariosForUser,
    getFamilyScenarioByIdForUser,
    saveFamilyScenario,
  } = await import("@/server/family/family-scenario-service"));
});

describe("family scenario service", () => {
  beforeEach(() => {
    findMany.mockReset();
    findFirst.mockReset();
    count.mockReset();
    create.mockReset();
    update.mockReset();
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
        },
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
