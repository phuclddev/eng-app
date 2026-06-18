import { describe, expect, it, vi } from "vitest";

import { INITIAL_SPEAKING_IDEA_PACK } from "../../prisma/speaking-idea-pack";
import { seedInitialSpeakingIdeaPack } from "../../prisma/seed-speaking-ideas";

function createPrismaMock(existingIdeas: Array<{ title: string; shortLabel: string }> = []) {
  const create = vi.fn().mockResolvedValue({});
  const findMany = vi.fn().mockResolvedValue(existingIdeas);

  return {
    prisma: {
      speakingIdea: {
        findMany,
        create,
      },
    },
    create,
    findMany,
  };
}

describe("seedInitialSpeakingIdeaPack", () => {
  it("creates the initial speaking idea pack when ideas do not exist", async () => {
    const { prisma, create, findMany } = createPrismaMock();

    const summary = await seedInitialSpeakingIdeaPack(prisma as never);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(summary.created).toBe(INITIAL_SPEAKING_IDEA_PACK.length);
    expect(summary.skipped).toBe(0);
    expect(create).toHaveBeenCalledTimes(INITIAL_SPEAKING_IDEA_PACK.length);
    expect(create.mock.calls[0]?.[0]?.data.status).toBe("ACTIVE");
  });

  it("skips duplicates by normalized title or short label without overwriting", async () => {
    const existingIdea = INITIAL_SPEAKING_IDEA_PACK[0];
    const { prisma, create } = createPrismaMock([
      {
        title: existingIdea.title.toUpperCase(),
        shortLabel: existingIdea.shortLabel,
      },
    ]);

    const summary = await seedInitialSpeakingIdeaPack(prisma as never);

    expect(summary.created).toBe(INITIAL_SPEAKING_IDEA_PACK.length - 1);
    expect(summary.skipped).toBe(1);
    expect(create).toHaveBeenCalledTimes(INITIAL_SPEAKING_IDEA_PACK.length - 1);
    expect(
      create.mock.calls.some(
        (call) => call[0]?.data?.title === existingIdea.title,
      ),
    ).toBe(false);
  });
});
