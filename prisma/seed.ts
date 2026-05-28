import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import {
  BOOTSTRAP_ADMIN_NAME,
  ensureBootstrapAdminUser,
} from "../src/server/bootstrap-admin";
import { slugify } from "../src/lib/utils";

const adapter = new PrismaMariaDb(
  process.env.DATABASE_URL ?? "mysql://localhost:3306/ielts_chunk_trainer",
);
const prisma = new PrismaClient({ adapter });

async function main() {
  const topicNames = ["Task 1", "Task 2", "Education", "Technology"];

  await ensureBootstrapAdminUser(prisma.user, {
    name: BOOTSTRAP_ADMIN_NAME,
  });

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
