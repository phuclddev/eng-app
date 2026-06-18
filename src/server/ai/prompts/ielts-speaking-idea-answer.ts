import type {
  AiTutorRecommendedChunkContext,
  GeneratedAnswerLength,
  IeltsTaskType,
  QuestionChunkUsageRole,
  SpeakingIdeaSupportType,
} from "@/lib/types";

import { buildAiTutorBaseInstructions, joinPromptLines } from "@/server/ai/prompts/base";

type IdeaAnswerChunkContext = AiTutorRecommendedChunkContext & {
  bandLevel: number;
  example?: string | null;
  source?: "GENERAL" | "RECOMMENDED" | "TOPIC";
  topic?: string | null;
};

function getLengthGuide(taskType: IeltsTaskType, length: GeneratedAnswerLength) {
  switch (taskType) {
    case "PART_1":
      return {
        SHORT: "Keep the answer around 50-80 words.",
        MEDIUM: "Keep the answer around 80-120 words.",
        LONG: "Keep the answer around 100-140 words, still concise and natural.",
      }[length];
    case "PART_2":
      return {
        SHORT: "Keep the cue-card answer around 140-180 words.",
        MEDIUM: "Keep the cue-card answer around 180-230 words.",
        LONG: "Keep the cue-card answer around 220-280 words.",
      }[length];
    case "PART_3":
      return {
        SHORT: "Keep the analytical answer around 100-130 words.",
        MEDIUM: "Keep the analytical answer around 130-170 words.",
        LONG: "Keep the analytical answer around 170-220 words.",
      }[length];
  }
}

function describeUsageRole(usageRole?: null | QuestionChunkUsageRole) {
  if (!usageRole) {
    return null;
  }

  return usageRole.toLowerCase().replaceAll("_", " ");
}

function describeSupportType(type: SpeakingIdeaSupportType) {
  return type.toLowerCase().replaceAll("_", " ");
}

function buildChunkContextSummary(chunks: IdeaAnswerChunkContext[]) {
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

export function buildIeltsSpeakingIdeaAnswerPrompt(input: {
  question: {
    taskType: IeltsTaskType;
    topic: string;
    subTopic?: string | null;
    prompt: string;
    supportingPoints: string[];
  };
  idea: {
    title: string;
    shortLabel: string;
    descriptionVi: string;
    descriptionEn: string;
    variants: Array<{
      bandLevel: number;
      phrase: string;
      exampleSentence: string;
    }>;
    supports: Array<{
      supportType: SpeakingIdeaSupportType;
      text: string;
      example: string | null;
    }>;
    patterns: Array<{
      patternText: string;
      exampleAnswer: string;
    }>;
    mappingReason?: string | null;
  };
  targetBand: number;
  length: GeneratedAnswerLength;
  recommendedChunks: IdeaAnswerChunkContext[];
}) {
  const variantSummary =
    input.idea.variants.length > 0
      ? input.idea.variants
          .map(
            (variant, index) =>
              `${index + 1}. Band ${variant.bandLevel.toFixed(1)} | ${variant.phrase} | ${variant.exampleSentence}`,
          )
          .join("\n")
      : "No idea variants were provided.";

  const supportSummary =
    input.idea.supports.length > 0
      ? input.idea.supports
          .map(
            (support, index) =>
              `${index + 1}. ${describeSupportType(support.supportType)} | ${support.text}${
                support.example ? ` | example: ${support.example}` : ""
              }`,
          )
          .join("\n")
      : "No support points were provided.";

  const patternSummary =
    input.idea.patterns.length > 0
      ? input.idea.patterns
          .map(
            (pattern, index) =>
              `${index + 1}. pattern: ${pattern.patternText} | sample: ${pattern.exampleAnswer}`,
          )
          .join("\n")
      : "No reusable patterns were provided.";

  return joinPromptLines([
    ...buildAiTutorBaseInstructions(),
    "Role: IELTS Speaking answer writer who uses one reusable idea naturally.",
    "Write a realistic spoken answer, never an IELTS Writing-style essay.",
    "Use the selected reusable idea clearly, but keep the answer natural and conversational.",
    "Use relevant chunks from the chunk shortlist only when they fit naturally.",
    "Do not force awkward collocations or keyword stuffing.",
    "Bold key chunks or reusable pattern phrases with Markdown **bold**.",
    "Show how the same idea can be reused for similar speaking questions.",
    "",
    `Speaking part: ${input.question.taskType}`,
    `Topic: ${input.question.topic}`,
    input.question.subTopic ? `Sub-topic: ${input.question.subTopic}` : null,
    `Prompt: ${input.question.prompt}`,
    `Target band: ${input.targetBand.toFixed(1)}`,
    `Requested length: ${input.length}`,
    `Length guide: ${getLengthGuide(input.question.taskType, input.length)}`,
    input.question.supportingPoints.length > 0
      ? `Cue card bullets:\n${input.question.supportingPoints.map((point) => `- ${point}`).join("\n")}`
      : null,
    "",
    "Selected reusable idea:",
    `Title: ${input.idea.title}`,
    `Short label: ${input.idea.shortLabel}`,
    `Vietnamese description: ${input.idea.descriptionVi}`,
    `English description: ${input.idea.descriptionEn}`,
    input.idea.mappingReason ? `Why this idea matches the question: ${input.idea.mappingReason}` : null,
    "",
    "Band variants:",
    variantSummary,
    "",
    "Support points:",
    supportSummary,
    "",
    "Reusable answer patterns:",
    patternSummary,
    "",
    "Relevant chunks from the Chunk Library:",
    buildChunkContextSummary(input.recommendedChunks),
    "",
    "Return Markdown with exactly these headings in order:",
    "# Sample Answer",
    "# Idea Used",
    "# Chunks / Phrases Used",
    "# Vietnamese Explanation",
    "# Reusable Pattern",
    "Under '# Chunks / Phrases Used', list only the chunks or phrases actually used.",
    "Under '# Idea Used', explain the core reusable idea briefly and clearly.",
    "Under '# Vietnamese Explanation', explain in Vietnamese why the answer sounds natural and how the idea can be reused.",
    "Under '# Reusable Pattern', give one short reusable pattern that Phuc can adapt for similar questions.",
  ]);
}
