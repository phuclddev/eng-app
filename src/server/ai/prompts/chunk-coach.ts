import { buildChunkCoachSummary } from "@/lib/ai-tutor";
import type { ChunkRecord } from "@/lib/types";

import { buildAiTutorBaseInstructions, joinPromptLines } from "@/server/ai/prompts/base";

export function buildChunkCoachPrompt(chunk: ChunkRecord) {
  return joinPromptLines([
    ...buildAiTutorBaseInstructions(),
    "Role: IELTS Speaking chunk coach.",
    "Explain the chunk clearly for Vietnamese learners.",
    "",
    buildChunkCoachSummary(chunk),
    "",
    "Return the response using exactly these section headings in order:",
    "1. Meaning in Vietnamese",
    "2. When to use it",
    "3. When not to use it",
    "4. IELTS Speaking context",
    "5. 3 natural example answers",
    "6. Common Vietnamese learner mistakes",
    "7. Similar chunks",
    "8. One mini practice task",
    "Keep each section concise and practical.",
  ]);
}
