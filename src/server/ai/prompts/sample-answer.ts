import type {
  AiTutorRecommendedChunkContext,
  IeltsTaskType,
  QuestionChunkUsageRole,
} from "@/lib/types";

import { buildAiTutorBaseInstructions, joinPromptLines } from "@/server/ai/prompts/base";

type SampleAnswerChunkContext = AiTutorRecommendedChunkContext & {
  bandLevel: number;
  example?: string | null;
  source?: "GENERAL" | "RECOMMENDED" | "TOPIC";
  topic?: string | null;
};

function getPartLengthGuide(taskType: IeltsTaskType) {
  switch (taskType) {
    case "PART_1":
      return "80-120 words maximum.";
    case "PART_2":
      return "180-250 words.";
    case "PART_3":
      return "120-180 words.";
  }
}

function describeUsageRole(usageRole?: null | QuestionChunkUsageRole) {
  if (!usageRole) {
    return null;
  }

  return usageRole
    .toLowerCase()
    .replaceAll("_", " ");
}

function buildChunkContextSummary(chunks: SampleAnswerChunkContext[]) {
  if (chunks.length === 0) {
    return "No chunk context is available.";
  }

  return chunks
    .map((chunk, index) =>
      [
        `${index + 1}. ${chunk.chunk}`,
        `meaning: ${chunk.meaningVi ?? "n/a"}`,
        `topic: ${chunk.topic ?? "General"}`,
        `band: ${chunk.bandLevel.toFixed(1)}`,
        chunk.usageRole ? `usage role: ${describeUsageRole(chunk.usageRole)}` : null,
        chunk.source ? `source: ${chunk.source.toLowerCase()}` : null,
        chunk.example ? `example: ${chunk.example}` : null,
        chunk.exampleSentence ? `mapped sentence: ${chunk.exampleSentence}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");
}

export function buildSampleAnswerPrompt(input: {
  prompt: string;
  recommendedChunks: SampleAnswerChunkContext[];
  subTopic?: null | string;
  supportingPoints: string[];
  targetBand: number;
  topic: string;
  taskType: IeltsTaskType;
}) {
  return joinPromptLines([
    ...buildAiTutorBaseInstructions(),
    "Role: IELTS Speaking sample answer writer.",
    "Write a realistic answer, not a keyword dump.",
    "Use as many relevant chunks as naturally possible, but never force awkward chunk usage.",
    "Every used chunk must be wrapped in Markdown bold like **this chunk**.",
    "If a chunk does not fit naturally, do not use it.",
    "",
    `Speaking part: ${input.taskType}`,
    `Topic: ${input.topic}`,
    input.subTopic ? `Sub-topic: ${input.subTopic}` : null,
    `Prompt: ${input.prompt}`,
    `Target band: ${input.targetBand.toFixed(1)}`,
    input.supportingPoints.length > 0
      ? `Cue card bullets:\n${input.supportingPoints.map((point) => `- ${point}`).join("\n")}`
      : null,
    "",
    "Available chunks:",
    buildChunkContextSummary(input.recommendedChunks),
    "",
    `Length guide: ${getPartLengthGuide(input.taskType)}`,
    "Return the result in Markdown using exactly these headings in order:",
    "## Sample answer",
    "## Chunks used",
    "## Chunks not used and why",
    "## Giai thich bang tieng Viet",
    "Under 'Chunks used', list only the chunks you actually used in the answer.",
    "Under 'Chunks not used and why', explain briefly why each remaining chunk was omitted or difficult to use naturally.",
    "The Vietnamese explanation should explain how the chunks were applied in the answer.",
  ]);
}
