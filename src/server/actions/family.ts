"use server";

import { revalidatePath } from "next/cache";

import {
  familyChunkBulkStatusUpdateSchema,
  familyChunkFormSchema,
  familyChunkStatusUpdateSchema,
  familyProfileFormSchema,
  familyScenarioBulkStatusUpdateSchema,
  familyScenarioFormSchema,
  familyScenarioStatusUpdateSchema,
  type FamilyChunkBulkStatusUpdatePayload,
  type FamilyChunkFormInput,
  type FamilyChunkStatusUpdatePayload,
  type FamilyProfileFormInput,
  type FamilyScenarioBulkStatusUpdatePayload,
  type FamilyScenarioFormInput,
  type FamilyScenarioStatusUpdatePayload,
} from "@/lib/validation";
import { requireApprovedSession } from "@/server/auth";
import {
  bulkSetFamilyChunkStatus,
  saveFamilyChunk,
  setFamilyChunkStatus,
} from "@/server/family/family-chunk-service";
import { deleteFamilyConversationForUser } from "@/server/family/family-conversation-service";
import { saveFamilyProfile } from "@/server/family/family-profile-service";
import {
  bulkSetFamilyScenarioStatus,
  saveFamilyScenario,
  setFamilyScenarioActiveState,
  setFamilyScenarioStatus,
} from "@/server/family/family-scenario-service";

function revalidateFamilyRoutes() {
  revalidatePath("/family");
  revalidatePath("/family/profile");
  revalidatePath("/family/scenarios");
  revalidatePath("/family/conversations");
  revalidatePath("/family/chunks");
}

export async function saveFamilyProfileAction(input: FamilyProfileFormInput) {
  try {
    const session = await requireApprovedSession();
    const values = familyProfileFormSchema.parse(input);

    const profile = await saveFamilyProfile({
      userId: session.user.id,
      email: session.user.email,
      title: values.title,
      profileMarkdown: values.profileMarkdown,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      profile,
      message: "Family profile saved successfully.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not save the family profile.",
    };
  }
}

export async function saveFamilyScenarioAction(input: FamilyScenarioFormInput) {
  try {
    const session = await requireApprovedSession();
    const values = familyScenarioFormSchema.parse(input);

    const scenario = await saveFamilyScenario({
      userId: session.user.id,
      email: session.user.email,
      values,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      scenario,
      message: values.id
        ? "Family scenario updated successfully."
        : "Family scenario created successfully.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not save the family scenario.",
    };
  }
}

export async function setFamilyScenarioStatusAction(
  input: FamilyScenarioStatusUpdatePayload,
) {
  try {
    const session = await requireApprovedSession();
    const values = familyScenarioStatusUpdateSchema.parse(input);

    const scenario = await setFamilyScenarioStatus({
      userId: session.user.id,
      email: session.user.email,
      scenarioId: values.scenarioId,
      status: values.status,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      scenario,
      message:
        values.status === "APPROVED"
          ? "Scenario approved successfully."
          : values.status === "ARCHIVED"
            ? "Scenario archived successfully."
            : "Scenario moved back to suggested.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the family scenario status.",
    };
  }
}

export async function bulkSetFamilyScenarioStatusAction(
  input: FamilyScenarioBulkStatusUpdatePayload,
) {
  try {
    const session = await requireApprovedSession();
    const values = familyScenarioBulkStatusUpdateSchema.parse(input);

    const scenarios = await bulkSetFamilyScenarioStatus({
      userId: session.user.id,
      scenarioIds: values.scenarioIds,
      status: values.status,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      scenarios,
      message:
        values.status === "APPROVED"
          ? "Selected scenarios approved successfully."
          : values.status === "ARCHIVED"
            ? "Selected scenarios archived successfully."
            : "Selected scenarios moved back to suggested.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the selected scenarios.",
    };
  }
}

export async function setFamilyScenarioActiveStateAction(input: {
  isActive: boolean;
  scenarioId: string;
}) {
  try {
    const session = await requireApprovedSession();
    const scenario = await setFamilyScenarioActiveState({
      userId: session.user.id,
      email: session.user.email,
      scenarioId: input.scenarioId,
      isActive: input.isActive,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      scenario,
      message: input.isActive
        ? "Scenario reactivated successfully."
        : "Scenario archived successfully.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the family scenario.",
    };
  }
}

export async function deleteFamilyConversationAction(input: {
  conversationId: string;
}) {
  try {
    const session = await requireApprovedSession();
    const conversation = await deleteFamilyConversationForUser({
      userId: session.user.id,
      conversationId: input.conversationId,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      conversation,
      message: "Family conversation deleted successfully.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not delete the family conversation.",
    };
  }
}

export async function saveFamilyChunkAction(input: FamilyChunkFormInput) {
  try {
    const session = await requireApprovedSession();
    const values = familyChunkFormSchema.parse(input);

    const chunk = await saveFamilyChunk({
      userId: session.user.id,
      values,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      chunk,
      message: values.id
        ? "Family chunk updated successfully."
        : "Family chunk created successfully.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not save the family chunk.",
    };
  }
}

export async function setFamilyChunkStatusAction(
  input: FamilyChunkStatusUpdatePayload,
) {
  try {
    const session = await requireApprovedSession();
    const values = familyChunkStatusUpdateSchema.parse(input);

    const chunk = await setFamilyChunkStatus({
      userId: session.user.id,
      chunkId: values.chunkId,
      status: values.status,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      chunk,
      message:
        values.status === "APPROVED"
          ? "Family chunk approved successfully."
          : values.status === "ARCHIVED"
            ? "Family chunk archived successfully."
            : "Family chunk moved back to suggested.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the family chunk status.",
    };
  }
}

export async function bulkSetFamilyChunkStatusAction(
  input: FamilyChunkBulkStatusUpdatePayload,
) {
  try {
    const session = await requireApprovedSession();
    const values = familyChunkBulkStatusUpdateSchema.parse(input);

    const chunks = await bulkSetFamilyChunkStatus({
      userId: session.user.id,
      chunkIds: values.chunkIds,
      status: values.status,
    });

    revalidateFamilyRoutes();

    return {
      ok: true,
      chunks,
      message:
        values.status === "APPROVED"
          ? "Selected family chunks approved successfully."
          : values.status === "ARCHIVED"
            ? "Selected family chunks archived successfully."
            : "Selected family chunks moved back to suggested.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not update the selected family chunks.",
    };
  }
}
