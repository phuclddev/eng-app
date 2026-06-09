import type { FamilyScenarioFormValues } from "@/lib/validation";
import type { FamilyChildFocus } from "@/lib/types";

import type { FamilyScenarioSeed } from "@/server/family/default-family-scenarios";

type FamilyScenarioSource = FamilyScenarioFormValues | FamilyScenarioSeed;

export function buildFamilyScenarioCreateData(input: {
  source: FamilyScenarioSource;
  userId: string;
}) {
  return {
    userId: input.userId,
    title: input.source.title.trim(),
    category: input.source.category.trim(),
    childFocus: input.source.childFocus as FamilyChildFocus,
    description: input.source.description.trim(),
    difficulty: input.source.difficulty,
    isActive: "isActive" in input.source ? input.source.isActive ?? true : true,
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
      isActive: true,
    },
    create: data,
  };
}
