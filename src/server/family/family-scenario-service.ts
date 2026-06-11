import { NotFoundError, ValidationError } from "@/lib/errors";
import type {
  FamilyScenarioRecord,
  FamilyScenarioSource,
  FamilyScenarioStatus,
} from "@/lib/types";
import type { FamilyScenarioFormValues } from "@/lib/validation";
import { prisma } from "@/server/prisma";

import { getDefaultFamilyScenariosForUser } from "@/server/family/default-family-scenarios";
import {
  buildFamilyScenarioCreateData,
  buildFamilyScenarioSeedUpsertArgs,
  normalizeFamilyScenarioTitle,
} from "@/server/family/family-scenario-helpers";

type FamilyScenarioModel = {
  id: string;
  userId: string;
  title: string;
  category: string;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  description: string;
  difficulty: number;
  isActive: boolean;
  status: FamilyScenarioStatus;
  source: FamilyScenarioSource;
  aiReason: string | null;
  suggestedGoals: unknown;
  suggestedChunks: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function mapFamilyScenario(scenario: FamilyScenarioModel): FamilyScenarioRecord {
  return {
    id: scenario.id,
    userId: scenario.userId,
    title: scenario.title,
    category: scenario.category,
    childFocus: scenario.childFocus,
    description: scenario.description,
    difficulty: scenario.difficulty,
    isActive: scenario.isActive,
    status: scenario.status,
    source: scenario.source,
    aiReason: scenario.aiReason,
    suggestedGoals: asStringArray(scenario.suggestedGoals),
    suggestedChunks: asStringArray(scenario.suggestedChunks),
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
  };
}

async function ensureUniqueFamilyScenarioTitle(input: {
  id?: string;
  title: string;
  userId: string;
}) {
  const normalizedTitle = normalizeFamilyScenarioTitle(input.title);
  const existing = await prisma.familyScenario.findFirst({
    where: {
      userId: input.userId,
      OR: [
        { title: input.title.trim() },
        { normalizedTitle },
      ],
    },
    select: {
      id: true,
    },
  });

  if (existing && existing.id !== input.id) {
    throw new ValidationError("A scenario with this title already exists.");
  }
}

export async function ensureDefaultFamilyScenariosForUser(input: {
  email?: null | string;
  userId: string;
}) {
  const defaults = getDefaultFamilyScenariosForUser(input.email);

  if (defaults.length === 0) {
    return [];
  }

  for (const scenario of defaults) {
    await prisma.familyScenario.upsert(
      buildFamilyScenarioSeedUpsertArgs({
        userId: input.userId,
        scenario,
      }),
    );
  }

  return defaults;
}

export async function listFamilyScenarios(input: {
  email?: null | string;
  userId: string;
}) {
  await ensureDefaultFamilyScenariosForUser(input);

  const scenarios = (await prisma.familyScenario.findMany({
    where: {
      userId: input.userId,
    },
    orderBy: [{ status: "asc" }, { category: "asc" }, { title: "asc" }],
  })) as FamilyScenarioModel[];

  return scenarios.map(mapFamilyScenario);
}

export async function listActiveFamilyScenarios(input: {
  email?: null | string;
  userId: string;
}) {
  await ensureDefaultFamilyScenariosForUser(input);

  const scenarios = (await prisma.familyScenario.findMany({
    where: {
      userId: input.userId,
      status: "APPROVED",
      isActive: true,
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  })) as FamilyScenarioModel[];

  return scenarios.map(mapFamilyScenario);
}

export async function getFamilyScenarioByIdForUser(input: {
  email?: null | string;
  scenarioId: string;
  userId: string;
  requireActive?: boolean;
}) {
  await ensureDefaultFamilyScenariosForUser(input);

  const scenario = (await prisma.familyScenario.findFirst({
    where: {
      id: input.scenarioId,
      userId: input.userId,
      ...(input.requireActive
        ? { isActive: true, status: "APPROVED" as const }
        : {}),
    },
  })) as FamilyScenarioModel | null;

  if (!scenario) {
    throw new NotFoundError("Family scenario was not found.");
  }

  return mapFamilyScenario(scenario);
}

export async function saveFamilyScenario(input: {
  email?: null | string;
  userId: string;
  values: FamilyScenarioFormValues;
}) {
  await ensureDefaultFamilyScenariosForUser(input);
  await ensureUniqueFamilyScenarioTitle({
    id: input.values.id,
    userId: input.userId,
    title: input.values.title,
  });

  const normalizedTitle = normalizeFamilyScenarioTitle(input.values.title);

  if (input.values.id) {
    await getFamilyScenarioByIdForUser({
      email: input.email,
      scenarioId: input.values.id,
      userId: input.userId,
    });

    const updated = (await prisma.familyScenario.update({
      where: {
        id: input.values.id,
      },
      data: {
        title: input.values.title.trim(),
        normalizedTitle,
        category: input.values.category.trim(),
        childFocus: input.values.childFocus,
        description: input.values.description.trim(),
        difficulty: input.values.difficulty,
        isActive:
          input.values.status === "ARCHIVED" ? false : input.values.isActive,
        status: input.values.status,
      },
    })) as FamilyScenarioModel;

    return mapFamilyScenario(updated);
  }

  const created = (await prisma.familyScenario.create({
    data: {
      ...buildFamilyScenarioCreateData({
        source: input.values,
        userId: input.userId,
      }),
      status: input.values.status,
      isActive:
        input.values.status === "ARCHIVED" ? false : input.values.isActive,
    },
  })) as FamilyScenarioModel;

  return mapFamilyScenario(created);
}

export async function setFamilyScenarioActiveState(input: {
  email?: null | string;
  isActive: boolean;
  scenarioId: string;
  userId: string;
}) {
  await getFamilyScenarioByIdForUser({
    email: input.email,
    scenarioId: input.scenarioId,
    userId: input.userId,
  });

  const updated = (await prisma.familyScenario.update({
    where: {
      id: input.scenarioId,
    },
    data: {
      isActive: input.isActive,
      status: input.isActive ? "APPROVED" : "ARCHIVED",
    },
  })) as FamilyScenarioModel;

  return mapFamilyScenario(updated);
}

export async function setFamilyScenarioStatus(input: {
  email?: null | string;
  scenarioId: string;
  status: FamilyScenarioStatus;
  userId: string;
}) {
  await getFamilyScenarioByIdForUser({
    email: input.email,
    scenarioId: input.scenarioId,
    userId: input.userId,
  });

  const updated = (await prisma.familyScenario.update({
    where: {
      id: input.scenarioId,
    },
    data: {
      status: input.status,
      isActive: input.status === "APPROVED",
    },
  })) as FamilyScenarioModel;

  return mapFamilyScenario(updated);
}

export async function bulkSetFamilyScenarioStatus(input: {
  scenarioIds: string[];
  status: FamilyScenarioStatus;
  userId: string;
}) {
  const uniqueIds = [...new Set(input.scenarioIds)];

  const owned = await prisma.familyScenario.findMany({
    where: {
      id: { in: uniqueIds },
      userId: input.userId,
    },
    select: { id: true },
  });

  if (owned.length !== uniqueIds.length) {
    throw new NotFoundError("One or more family scenarios were not found.");
  }

  await prisma.familyScenario.updateMany({
    where: {
      id: { in: uniqueIds },
      userId: input.userId,
    },
    data: {
      status: input.status,
      isActive: input.status === "APPROVED",
    },
  });

  const updated = (await prisma.familyScenario.findMany({
    where: {
      id: { in: uniqueIds },
      userId: input.userId,
    },
    orderBy: [{ status: "asc" }, { title: "asc" }],
  })) as FamilyScenarioModel[];

  return updated.map(mapFamilyScenario);
}

export async function getFamilyScenarioSummary(input: {
  email?: null | string;
  userId: string;
}) {
  await ensureDefaultFamilyScenariosForUser(input);

  const [totalActiveScenarios, totalSuggestedScenarios] = await Promise.all([
    prisma.familyScenario.count({
      where: {
        userId: input.userId,
        status: "APPROVED",
        isActive: true,
      },
    }),
    prisma.familyScenario.count({
      where: {
        userId: input.userId,
        status: "SUGGESTED",
      },
    }),
  ]);

  return {
    totalActiveScenarios,
    totalSuggestedScenarios,
  };
}
