import { parseStructuredMissingChunks } from "@/lib/ai-tutor";
import type { AiMissingChunksPayload } from "@/lib/validation";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildMissingChunksPrompt } from "@/server/ai/prompts/missing-chunks";

export async function getAiMissingChunksRecommendation(
  payload: AiMissingChunksPayload,
) {
  const response = await callAiTutor({
    query: buildMissingChunksPrompt({
      prompt: payload.prompt,
      targetChunk: payload.targetChunk,
      recommendedChunks: payload.recommendedChunks,
      userAnswer: payload.userAnswer,
      topic: payload.topic,
      part: payload.part,
    }),
  });

  return {
    answer: response.answer,
    sections: parseStructuredMissingChunks(response.answer) ?? undefined,
  };
}
