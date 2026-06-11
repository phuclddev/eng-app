function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

type ChunkLine = {
  chunk: string;
  meaningVi: string;
  source: "RECOMMENDED" | "TOPIC" | "GENERAL";
  topic?: string | null;
};

export function buildTranslationRecallFromQuestionPrompt(input: {
  taskType: "PART_1" | "PART_2" | "PART_3";
  topic: string;
  subTopic: string | null;
  prompt: string;
  supportingPoints: string[];
  targetBand: number;
  length: "SHORT" | "MEDIUM" | "LONG";
  chunkLines: ChunkLine[];
}) {
  const lengthGuidance = {
    SHORT: "Keep the spoken answer about 90 to 140 words.",
    MEDIUM: "Keep the spoken answer about 160 to 220 words.",
    LONG: "Keep the spoken answer about 240 to 320 words.",
  }[input.length];

  return joinPromptLines([
    "You are an IELTS Speaking coach AND a Vietnamese translator.",
    "Generate a single natural IELTS Speaking sample answer for the question below, then translate it into natural Vietnamese, and align it sentence-by-sentence.",
    "Return STRICT JSON only. No Markdown fences. No prose outside the JSON object.",
    "Inside the English answer text, surround any reusable chunk with Markdown bold (**chunk**) when it appears naturally. Do not over-bold.",
    "Use the provided recommended chunks where they fit naturally. Do not stuff keywords.",
    "Vietnamese translation must preserve meaning, be natural, and align with each English sentence when practical.",
    "",
    `Speaking part: ${input.taskType}`,
    `Topic: ${input.topic}`,
    input.subTopic ? `Sub-topic: ${input.subTopic}` : null,
    `Target band: ${input.targetBand}`,
    `Length: ${input.length} — ${lengthGuidance}`,
    "",
    "Prompt:",
    input.prompt,
    input.supportingPoints.length > 0
      ? "Supporting points (use only if helpful):"
      : null,
    ...input.supportingPoints.map((point) => `- ${point}`),
    "",
    input.chunkLines.length > 0 ? "Chunk shortlist (use the most natural ones, ignore the rest):" : null,
    ...input.chunkLines.map(
      (chunk) =>
        `- ${chunk.chunk} = ${chunk.meaningVi} (${chunk.source}${chunk.topic ? `, ${chunk.topic}` : ""})`,
    ),
    "",
    "Return strictly this JSON object:",
    "{",
    '  "title": "string — short title for this Translation Recall script (max 90 chars)",',
    '  "englishAnswer": "string — full spoken answer in English with Markdown bold for chunks",',
    '  "vietnameseTranslation": "string — full Vietnamese translation",',
    '  "sentences": [',
    "    {",
    '      "english": "string",',
    '      "vietnamese": "string"',
    "    }",
    "  ],",
    '  "usedChunks": ["string — exact chunk text used"]',
    "}",
    "",
    "Rules:",
    "- sentences must align English and Vietnamese by index.",
    "- 4 to 12 sentence pairs is ideal.",
    "- englishAnswer and vietnameseTranslation are the joined forms of those sentences.",
    "- usedChunks must only contain chunks that actually appear in englishAnswer.",
  ]);
}
