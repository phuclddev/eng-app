import type { Prisma, PrismaClient } from "@prisma/client";

import { normalizeText } from "../src/lib/utils";
import {
  INITIAL_SPEAKING_IDEA_PACK,
  INITIAL_SPEAKING_IDEA_PACK_VERSION,
  type SeedSpeakingIdea,
} from "./speaking-idea-pack";

export type SpeakingIdeaSeedSummary = {
  created: number;
  skipped: number;
  total: number;
};

function normalizeSpeakingIdeaIdentity(value: string) {
  return normalizeText(value).slice(0, 191);
}

function validateUniqueSeedPack(ideas: SeedSpeakingIdea[]) {
  const seenTitles = new Set<string>();
  const seenShortLabels = new Set<string>();

  for (const idea of ideas) {
    const titleKey = normalizeSpeakingIdeaIdentity(idea.title);
    const shortLabelKey = normalizeSpeakingIdeaIdentity(idea.shortLabel);

    if (seenTitles.has(titleKey)) {
      throw new Error(`Duplicate speaking idea title in seed pack: ${idea.title}`);
    }

    if (seenShortLabels.has(shortLabelKey)) {
      throw new Error(`Duplicate speaking idea short label in seed pack: ${idea.shortLabel}`);
    }

    seenTitles.add(titleKey);
    seenShortLabels.add(shortLabelKey);
  }
}

function buildIdeaCreateInput(idea: SeedSpeakingIdea): Prisma.SpeakingIdeaCreateInput {
  return {
    title: idea.title,
    shortLabel: idea.shortLabel,
    descriptionVi: idea.descriptionVi,
    descriptionEn: idea.descriptionEn,
    popularityScore: idea.popularityScore,
    reuseScore: idea.reuseScore,
    status: "ACTIVE",
    generatedBatchId: INITIAL_SPEAKING_IDEA_PACK_VERSION,
    aiReason: `Initial idea pack seed. Example question coverage: ${idea.exampleQuestions.join(" | ")}`,
    variants: {
      create: idea.variants.map((variant) => ({
        bandLevel: variant.bandLevel,
        phrase: variant.phrase,
        exampleSentence: variant.exampleSentence,
      })),
    },
    supports: {
      create: idea.supports.map((support) => ({
        supportType: support.supportType,
        text: support.text,
        example: support.example ?? null,
      })),
    },
    patterns: {
      create: idea.patterns.map((pattern) => ({
        patternText: pattern.patternText,
        exampleAnswer: pattern.exampleAnswer,
        ...(pattern.variablesJson === undefined || pattern.variablesJson === null
          ? {}
          : { variablesJson: pattern.variablesJson }),
      })),
    },
  };
}

export async function seedInitialSpeakingIdeaPack(prisma: PrismaClient) {
  validateUniqueSeedPack(INITIAL_SPEAKING_IDEA_PACK);

  const existingIdeas = await prisma.speakingIdea.findMany({
    select: {
      title: true,
      shortLabel: true,
    },
  });

  const normalizedTitles = new Set(
    existingIdeas.map((idea) => normalizeSpeakingIdeaIdentity(idea.title)),
  );
  const normalizedShortLabels = new Set(
    existingIdeas.map((idea) => normalizeSpeakingIdeaIdentity(idea.shortLabel)),
  );

  let created = 0;
  let skipped = 0;

  for (const idea of INITIAL_SPEAKING_IDEA_PACK) {
    const titleKey = normalizeSpeakingIdeaIdentity(idea.title);
    const shortLabelKey = normalizeSpeakingIdeaIdentity(idea.shortLabel);

    if (normalizedTitles.has(titleKey) || normalizedShortLabels.has(shortLabelKey)) {
      skipped += 1;
      continue;
    }

    await prisma.speakingIdea.create({
      data: buildIdeaCreateInput(idea),
    });

    normalizedTitles.add(titleKey);
    normalizedShortLabels.add(shortLabelKey);
    created += 1;
  }

  return {
    created,
    skipped,
    total: INITIAL_SPEAKING_IDEA_PACK.length,
  } satisfies SpeakingIdeaSeedSummary;
}
