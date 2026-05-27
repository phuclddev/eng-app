import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { slugify } from "../src/lib/utils";

const adapter = new PrismaMariaDb(
  process.env.DATABASE_URL ?? "mysql://localhost:3306/ielts_chunk_trainer",
);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const topicNames = ["Task 1", "Task 2", "Education", "Technology"];

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
    },
    create: {
      email: adminEmail,
      name: "Platform Admin",
      role: UserRole.ADMIN,
      status: UserStatus.APPROVED,
      approvedAt: new Date(),
    },
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
