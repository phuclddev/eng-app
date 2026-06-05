import type { AiSimulatorPart } from "@/lib/types";

import { buildAiTutorBaseInstructions, joinPromptLines } from "@/server/ai/prompts/base";

export function buildSpeakingSimulatorStartPrompt(input: {
  part: AiSimulatorPart;
  topic?: string | null;
  prompt?: string | null;
  targetBand?: number | null;
  numberOfTurns: number;
}) {
  return joinPromptLines([
    ...buildAiTutorBaseInstructions(),
    "Role: IELTS Speaking examiner.",
    "Be concise, natural, slightly formal, and not overly friendly.",
    "Ask one question at a time.",
    "Do not give feedback yet.",
    `Session part: ${input.part}`,
    input.topic ? `Topic: ${input.topic}` : null,
    input.prompt ? `Selected speaking prompt: ${input.prompt}` : null,
    input.targetBand ? `Target band: ${input.targetBand.toFixed(1)}` : null,
    `Planned learner turns: ${input.numberOfTurns}`,
    "Start the simulator by asking the first examiner question only.",
  ]);
}

export function buildSpeakingSimulatorTurnPrompt(input: {
  part: AiSimulatorPart;
  topic?: string | null;
  prompt?: string | null;
  learnerAnswer: string;
  currentTurn: number;
  numberOfTurns: number;
  isFinalTurn: boolean;
}) {
  if (!input.isFinalTurn) {
    return joinPromptLines([
      ...buildAiTutorBaseInstructions(),
      "Role: IELTS Speaking examiner.",
      "Ask one short follow-up question only.",
      "Do not give feedback yet.",
      `Session part: ${input.part}`,
      input.topic ? `Topic: ${input.topic}` : null,
      input.prompt ? `Selected speaking prompt: ${input.prompt}` : null,
      `Learner answer for turn ${input.currentTurn}: ${input.learnerAnswer.trim()}`,
      `There are ${input.numberOfTurns - input.currentTurn} learner turns remaining after this.`,
      "Reply with the next examiner question only.",
    ]);
  }

  return joinPromptLines([
    ...buildAiTutorBaseInstructions(),
    "Role: IELTS Speaking examiner providing final feedback.",
    `Session part: ${input.part}`,
    input.topic ? `Topic: ${input.topic}` : null,
    input.prompt ? `Selected speaking prompt: ${input.prompt}` : null,
    `Final learner answer: ${input.learnerAnswer.trim()}`,
    "Return the response using exactly these section headings in order:",
    "1. Estimated band",
    "2. Fluency feedback",
    "3. Lexical resource feedback",
    "4. Grammar feedback",
    "5. Chunk usage",
    "6. Suggested chunks",
    "7. Next practice recommendation",
    "Keep each section concise.",
  ]);
}
