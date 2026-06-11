function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildTranslationChunkExtractPrompt(input: {
  scriptTitle: string;
  scriptTopic: string;
  scriptBandLevel: number;
  englishSentence: string;
  vietnameseSentence: string;
  selectedPhrase: string;
}) {
  return joinPromptLines([
    "You are an IELTS Speaking coach helping a Vietnamese learner extract a reusable English chunk from a translation script sentence.",
    "Return JSON only. No Markdown fences. No commentary.",
    "Keep the chunk short and reusable in real IELTS Speaking responses.",
    "If the highlighted phrase is too short to be a useful chunk, expand it to the smallest natural collocation around it.",
    "If the highlighted phrase is too long, narrow it to the strongest collocation.",
    "",
    `Script title: ${input.scriptTitle}`,
    `Script topic: ${input.scriptTopic}`,
    `Script band level: ${input.scriptBandLevel}`,
    "",
    "Original English sentence:",
    input.englishSentence,
    "",
    "Vietnamese translation:",
    input.vietnameseSentence,
    "",
    "Highlighted phrase the learner wants to save:",
    input.selectedPhrase,
    "",
    "Return strictly this JSON shape:",
    "{",
    '  "chunk": "string — the reusable English chunk, 2 to 10 words",',
    '  "meaningVi": "string — concise Vietnamese meaning, no more than 120 characters",',
    '  "usage": "string — short note on when to use it naturally in IELTS Speaking",',
    '  "example": "string — one natural IELTS-friendly example sentence using the chunk",',
    '  "suggestedTopic": "string — best matching IELTS Speaking topic (e.g. Work, Travel, Family, Hometown)",',
    '  "bandEstimate": "number — estimated band value between 5 and 8, expressed as a decimal"',
    "}",
  ]);
}
