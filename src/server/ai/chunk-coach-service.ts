import { parseStructuredChunkCoach } from "@/lib/ai-tutor";
import { NotFoundError } from "@/lib/errors";
import { getChunkById } from "@/server/data/chunks";
import { callAiTutor } from "@/server/ai/ai-chatflow-client";
import { buildChunkCoachPrompt } from "@/server/ai/prompts/chunk-coach";

export async function getAiChunkCoach(chunkId: string) {
  const chunk = await getChunkById(chunkId);

  if (!chunk) {
    throw new NotFoundError("Chunk not found.");
  }

  const response = await callAiTutor({
    query: buildChunkCoachPrompt(chunk),
  });

  return {
    chunk,
    answer: response.answer,
    sections: parseStructuredChunkCoach(response.answer) ?? undefined,
  };
}
