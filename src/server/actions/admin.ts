"use server";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";
import {
  chunkFormSchema,
  questionChunkMappingsFormSchema,
  topicFormSchema,
  userModerationSchema,
  type ChunkFormInput,
  type QuestionChunkMappingsFormInput,
  type TopicFormInput,
} from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { saveTopic, saveChunk, removeChunk } from "@/server/data/chunks";
import { updateUserModeration } from "@/server/data/admin";
import { saveQuestionChunkMappings } from "@/server/data/questions";

const revalidateTargets = [
  "/dashboard",
  "/learn",
  "/questions",
  "/chunks",
  "/practice",
  "/review",
  "/progress",
  "/admin",
  "/admin/questions",
];

function refreshWorkspace() {
  for (const path of revalidateTargets) {
    revalidatePath(path);
  }
}

export async function saveTopicAction(input: TopicFormInput) {
  try {
    await requireAdminApiSession();
    const values = topicFormSchema.parse(input);
    await saveTopic(values);
    refreshWorkspace();
    return { ok: true, message: "Topic saved successfully." };
  } catch (error) {
    logger.error({ error }, "Failed to save topic");
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to save topic.",
    };
  }
}

export async function saveChunkAction(input: ChunkFormInput) {
  try {
    const session = await requireAdminApiSession();
    const values = chunkFormSchema.parse(input);
    await saveChunk(values, session.user.id);
    refreshWorkspace();
    return { ok: true, message: "Chunk saved successfully." };
  } catch (error) {
    logger.error({ error }, "Failed to save chunk");
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unable to save chunk.",
    };
  }
}

export async function deleteChunkAction(id: string) {
  try {
    await requireAdminApiSession();
    await removeChunk(id);
    refreshWorkspace();
    return { ok: true, message: "Chunk archived successfully." };
  } catch (error) {
    logger.error({ error }, "Failed to delete chunk");
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to delete this chunk.",
    };
  }
}

export async function moderateUserAction(input: {
  userId: string;
  status: "PENDING" | "APPROVED" | "BLOCKED";
  role?: "USER" | "ADMIN";
  notes?: string;
}) {
  try {
    await requireAdminApiSession();
    const values = userModerationSchema.parse(input);
    await updateUserModeration(values);
    refreshWorkspace();
    return { ok: true, message: "User status updated." };
  } catch (error) {
    logger.error({ error }, "Failed to moderate user");
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to update this user.",
    };
  }
}

export async function saveQuestionChunkMappingsAction(
  input: QuestionChunkMappingsFormInput,
) {
  try {
    await requireAdminApiSession();
    const values = questionChunkMappingsFormSchema.parse(input);
    await saveQuestionChunkMappings(values);
    refreshWorkspace();
    return { ok: true, message: "Question chunk mappings saved." };
  } catch (error) {
    logger.error({ error }, "Failed to save question chunk mappings");
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save question chunk mappings.",
    };
  }
}
