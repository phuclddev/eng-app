"use server";

import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";
import {
  chunkFormSchema,
  questionChunkMappingsFormSchema,
  speakingIdeaFormSchema,
  speakingIdeaMindMapSchema,
  topicFormSchema,
  userModerationSchema,
  type ChunkFormInput,
  type QuestionChunkMappingsFormInput,
  type SpeakingIdeaFormInput,
  type SpeakingIdeaMindMapInput,
  type TopicFormInput,
} from "@/lib/validation";
import { requireAdminApiSession } from "@/server/auth";
import { saveTopic, saveChunk, removeChunk } from "@/server/data/chunks";
import { updateUserModeration } from "@/server/data/admin";
import { saveQuestionChunkMappings } from "@/server/data/questions";
import {
  saveSpeakingIdea,
  saveSpeakingIdeaMindMap,
  setSpeakingIdeaStatus,
} from "@/server/data/speaking-ideas";

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
  "/admin/ideas",
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

export async function saveSpeakingIdeaAction(input: SpeakingIdeaFormInput) {
  try {
    const session = await requireAdminApiSession();
    const values = speakingIdeaFormSchema.parse(input);
    logger.info(
      {
        adminUserId: session.user.id,
        ideaId: values.id,
        status: values.status,
        variantCount: values.variants.length,
        supportCount: values.supports.length,
        patternCount: values.patterns.length,
        questionMapCount: values.questionMaps.length,
      },
      "Saving speaking idea",
    );
    const idea = await saveSpeakingIdea(values);
    refreshWorkspace();
    revalidatePath("/admin/ideas/new");
    revalidatePath(`/admin/ideas/${idea.id}`);
    return {
      ok: true,
      idea,
      message: values.id
        ? "Speaking idea updated successfully."
        : "Speaking idea created successfully.",
    };
  } catch (error) {
    logger.error({ error }, "Failed to save speaking idea");
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Unable to save speaking idea.",
    };
  }
}

export async function setSpeakingIdeaStatusAction(input: {
  ideaId: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT";
}) {
  try {
    const session = await requireAdminApiSession();
    logger.info(
      {
        adminUserId: session.user.id,
        ideaId: input.ideaId,
        status: input.status,
      },
      "Updating speaking idea status",
    );
    const result = await setSpeakingIdeaStatus(input);
    refreshWorkspace();
    revalidatePath(`/admin/ideas/${result.id}`);
    return {
      ok: true,
      result,
      message:
        input.status === "ACTIVE"
          ? "Speaking idea activated successfully."
          : input.status === "ARCHIVED"
            ? "Speaking idea archived successfully."
            : "Speaking idea moved back to draft.",
    };
  } catch (error) {
    logger.error({ error }, "Failed to update speaking idea status");
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update speaking idea status.",
    };
  }
}

export async function saveSpeakingIdeaMindMapAction(
  input: SpeakingIdeaMindMapInput,
) {
  try {
    const session = await requireAdminApiSession();
    const values = speakingIdeaMindMapSchema.parse(input);
    logger.info(
      {
        adminUserId: session.user.id,
        ideaId: values.ideaId,
        sourceType: values.sourceType,
        sourceLength: values.sourceText.length,
      },
      "Saving speaking idea mind map source",
    );
    const result = await saveSpeakingIdeaMindMap(values);
    refreshWorkspace();
    revalidatePath("/admin/ideas/map");
    revalidatePath(`/admin/ideas/${result.ideaId}`);
    revalidatePath(`/admin/ideas/${result.ideaId}/study-map`);
    return {
      ok: true,
      result,
      message: "Mind map source saved successfully.",
    };
  } catch (error) {
    logger.error({ error }, "Failed to save speaking idea mind map source");
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to save speaking idea mind map source.",
    };
  }
}
