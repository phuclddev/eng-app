import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  buildBootstrapAdminUpsertArgs,
  BOOTSTRAP_ADMIN_NAME,
} from "../src/server/bootstrap-admin";
import { buildFamilyProfileUpsertArgs } from "../src/server/family/family-profile-helpers";
import { getDefaultFamilyScenariosForUser } from "../src/server/family/default-family-scenarios";
import { buildFamilyScenarioSeedUpsertArgs } from "../src/server/family/family-scenario-helpers";
import { slugify } from "../src/lib/utils";
import { seedInitialSpeakingIdeaPack } from "./seed-speaking-ideas";

const adapter = new PrismaMariaDb(
  process.env.DATABASE_URL ?? "mysql://localhost:3306/ielts_chunk_trainer",
);
const prisma = new PrismaClient({ adapter });

async function main() {
  const topicNames = ["Task 1", "Task 2", "Education", "Technology"];

  const bootstrapAdmin = await prisma.user.upsert(buildBootstrapAdminUpsertArgs({
    name: BOOTSTRAP_ADMIN_NAME,
  }));

  await prisma.familyProfile.upsert(
    buildFamilyProfileUpsertArgs({
      userId: bootstrapAdmin.id,
      email: bootstrapAdmin.email,
    }),
  );

  for (const scenario of getDefaultFamilyScenariosForUser(bootstrapAdmin.email)) {
    await prisma.familyScenario.upsert(
      buildFamilyScenarioSeedUpsertArgs({
        userId: bootstrapAdmin.id,
        scenario,
      }),
    );
  }

  for (const topicName of topicNames) {
    await prisma.topic.upsert({
      where: {
        slug: slugify(topicName),
      },
      update: {},
      create: {
        name: topicName,
        slug: slugify(topicName),
      },
    });
  }

  try {
    const ideaSummary = await seedInitialSpeakingIdeaPack(prisma);

    console.info(
      `[seed] speaking idea pack: created=${ideaSummary.created} skipped=${ideaSummary.skipped} total=${ideaSummary.total}`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021" &&
      error.meta?.modelName === "SpeakingIdea"
    ) {
      console.warn(
        "[seed] skipped speaking idea pack because the SpeakingIdea table does not exist in the current database yet. Apply the Speaking Idea Map migrations first if you want the initial idea bank.",
      );
    } else {
      throw error;
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
