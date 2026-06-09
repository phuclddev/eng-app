import { NotFoundError, ValidationError } from "@/lib/errors";
import type { FamilyScenarioRecord } from "@/lib/types";
import type { FamilyScenarioFormValues } from "@/lib/validation";
import { prisma } from "@/server/prisma";

import { getDefaultFamilyScenariosForUser } from "@/server/family/default-family-scenarios";
import {
  buildFamilyScenarioCreateData,
  buildFamilyScenarioSeedUpsertArgs,
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
  createdAt: Date;
  updatedAt: Date;
};

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
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
  };
}

async function ensureUniqueFamilyScenarioTitle(input: {
  id?: string;
  title: string;
  userId: string;
}) {
  const existing = await prisma.familyScenario.findFirst({
    where: {
      userId: input.userId,
      title: input.title.trim(),
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

  const scenarios = await prisma.familyScenario.findMany({
    where: {
      userId: input.userId,
    },
    orderBy: [{ isActive: "desc" }, { category: "asc" }, { title: "asc" }],
  });

  return scenarios.map(mapFamilyScenario);
}

export async function listActiveFamilyScenarios(input: {
  email?: null | string;
  userId: string;
}) {
  await ensureDefaultFamilyScenariosForUser(input);

  const scenarios = await prisma.familyScenario.findMany({
    where: {
      userId: input.userId,
      isActive: true,
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

  return scenarios.map(mapFamilyScenario);
}

export async function getFamilyScenarioByIdForUser(input: {
  email?: null | string;
  scenarioId: string;
  userId: string;
  requireActive?: boolean;
}) {
  await ensureDefaultFamilyScenariosForUser(input);

  const scenario = await prisma.familyScenario.findFirst({
    where: {
      id: input.scenarioId,
      userId: input.userId,
      ...(input.requireActive ? { isActive: true } : {}),
    },
  });

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

  if (input.values.id) {
    await getFamilyScenarioByIdForUser({
      email: input.email,
      scenarioId: input.values.id,
      userId: input.userId,
    });

    const updated = await prisma.familyScenario.update({
      where: {
        id: input.values.id,
      },
      data: {
        title: input.values.title.trim(),
        category: input.values.category.trim(),
        childFocus: input.values.childFocus,
        description: input.values.description.trim(),
        difficulty: input.values.difficulty,
        isActive: input.values.isActive,
      },
    });

    return mapFamilyScenario(updated);
  }

  const created = await prisma.familyScenario.create({
    data: buildFamilyScenarioCreateData({
      source: input.values,
      userId: input.userId,
    }),
  });

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

  const updated = await prisma.familyScenario.update({
    where: {
      id: input.scenarioId,
    },
    data: {
      isActive: input.isActive,
    },
  });

  return mapFamilyScenario(updated);
}

export async function getFamilyScenarioSummary(input: {
  email?: null | string;
  userId: string;
}) {
  await ensureDefaultFamilyScenariosForUser(input);

  const totalActiveScenarios = await prisma.familyScenario.count({
    where: {
      userId: input.userId,
      isActive: true,
    },
  });

  return {
    totalActiveScenarios,
  };
}
