import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import {
  buildBootstrapAdminUpsertArgs,
  BOOTSTRAP_ADMIN_NAME,
} from "../src/server/bootstrap-admin";
import { buildFamilyProfileUpsertArgs } from "../src/server/family/family-profile-helpers";
import { getDefaultFamilyScenariosForUser } from "../src/server/family/default-family-scenarios";
import { buildFamilyScenarioSeedUpsertArgs } from "../src/server/family/family-scenario-helpers";
import { slugify } from "../src/lib/utils";

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
