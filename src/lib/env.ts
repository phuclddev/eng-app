import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z
    .string()
    .min(16)
    .default("development-secret-not-for-production"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  AI_CHATFLOW_URL: z.union([z.string().url(), z.literal("")]).default(""),
  AI_CHATFLOW_TOKEN: z.string().default(""),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export function getEnv() {
  return envSchema.parse(process.env);
}

export function isGoogleAuthConfigured() {
  const env = getEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function isAiTutorConfigured() {
  const env = getEnv();
  return Boolean(env.AI_CHATFLOW_URL && env.AI_CHATFLOW_TOKEN);
}
