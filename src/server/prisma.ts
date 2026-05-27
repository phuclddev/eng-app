import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

import { getEnv } from "@/lib/env";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const env = getEnv();
  const adapter = new PrismaMariaDb(
    env.DATABASE_URL ?? "mysql://localhost:3306/ielts_chunk_trainer",
  );

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma =
  globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
