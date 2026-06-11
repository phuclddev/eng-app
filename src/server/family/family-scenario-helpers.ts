import type { FamilyScenarioFormValues } from "@/lib/validation";
import type { FamilyChildFocus } from "@/lib/types";

import type { FamilyScenarioSeed } from "@/server/family/default-family-scenarios";

type FamilyScenarioFormOrSeed = FamilyScenarioFormValues | FamilyScenarioSeed;

export function normalizeFamilyScenarioTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .slice(0, 191);
}

export function buildFamilyScenarioCreateData(input: {
  source: FamilyScenarioFormOrSeed;
  userId: string;
}) {
  const title = input.source.title.trim();
  const formStatus =
    "status" in input.source ? input.source.status : "APPROVED";

  return {
    userId: input.userId,
    title,
    normalizedTitle: normalizeFamilyScenarioTitle(title),
    category: input.source.category.trim(),
    childFocus: input.source.childFocus as FamilyChildFocus,
    description: input.source.description.trim(),
    difficulty: input.source.difficulty,
    isActive: "isActive" in input.source ? input.source.isActive ?? true : true,
    status: formStatus,
    source: "MANUAL" as const,
  };
}

export function buildFamilyScenarioSeedUpsertArgs(input: {
  scenario: FamilyScenarioSeed;
  userId: string;
}) {
  const data = buildFamilyScenarioCreateData({
    source: {
      ...input.scenario,
      isActive: true,
    },
    userId: input.userId,
  });

  return {
    where: {
      userId_title: {
        userId: input.userId,
        title: data.title,
      },
    },
    update: {
      category: data.category,
      childFocus: data.childFocus,
      description: data.description,
      difficulty: data.difficulty,
      normalizedTitle: data.normalizedTitle,
      isActive: true,
      status: "APPROVED" as const,
      source: "MANUAL" as const,
    },
    create: data,
  };
}
