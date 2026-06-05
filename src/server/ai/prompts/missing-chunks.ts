import { buildMissingChunksRequestSummary } from "@/lib/ai-tutor";
import type { AiTutorRecommendedChunkContext, AiSimulatorPart } from "@/lib/types";

import { buildAiTutorBaseInstructions, joinPromptLines } from "@/server/ai/prompts/base";

export function buildMissingChunksPrompt(input: {
  prompt?: string;
  targetChunk?: string;
  recommendedChunks?: AiTutorRecommendedChunkContext[];
  userAnswer: string;
  topic?: string;
  part?: AiSimulatorPart;
}) {
  return joinPromptLines([
    ...buildAiTutorBaseInstructions(),
    "Role: IELTS Speaking answer improver.",
    "Identify only realistic chunk improvements.",
    "Do not force every recommended chunk into the answer.",
    "Prefer natural IELTS Speaking chunks and practical improvement.",
    "",
    buildMissingChunksRequestSummary(input),
    "",
    "Return the response using exactly these section headings in order:",
    "1. Chunks already used",
    "2. Missing useful chunks",
    "3. Improved answer",
    "4. Short explanation in Vietnamese",
    "5. Next mini task",
    "Keep each section concise.",
  ]);
}
