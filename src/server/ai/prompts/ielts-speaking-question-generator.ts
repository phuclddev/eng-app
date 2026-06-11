function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

const COMMON_TOPICS = [
  "Work and study",
  "Hometown",
  "Accommodation",
  "Family",
  "Friends",
  "Technology",
  "Social media",
  "Education",
  "Travel",
  "Food",
  "Health",
  "Sports",
  "Hobbies",
  "Weather",
  "Environment",
  "Shopping",
  "Money",
  "Books",
  "Films",
  "Music",
  "Festivals",
  "Transport",
  "Daily routine",
  "Childhood",
  "Memories",
  "Future plans",
];

export function buildIeltsSpeakingQuestionGeneratorPrompt(input: {
  part: "PART_1" | "PART_2" | "PART_3" | "MIXED";
  topic?: string | null;
  count: number;
  targetBand: number;
  includeRecommendedChunks: boolean;
  existingPromptLines: string[];
  chunkLibraryLines: string[];
}) {
  return joinPromptLines([
    "You are an experienced IELTS Speaking trainer building a practice question bank.",
    "Generate ORIGINAL practice questions inspired by common/high-probability IELTS Speaking topics.",
    "These are practice-focused — do NOT claim they will appear in the real exam.",
    "Do NOT copy real test wording verbatim. Avoid copyrighted IELTS prompts.",
    "Do NOT generate Writing Task 1 or Task 2 prompts. Speaking only.",
    "Return STRICT JSON only. No Markdown fences. No commentary outside the JSON object.",
    "",
    `Speaking part: ${input.part}`,
    input.topic
      ? `Topic preference: ${input.topic}.`
      : "Vary topics across the high-frequency palette below.",
    `Generate ${input.count} questions.`,
    `Suggested target band for difficulty/chunk choice: ${input.targetBand}.`,
    input.includeRecommendedChunks
      ? "Include 2-5 short reusable English chunks per question (recommendedChunks)."
      : "Do not include recommendedChunks.",
    "",
    "High-frequency topic palette:",
    ...COMMON_TOPICS.map((topic) => `- ${topic}`),
    "",
    "Existing prompts in the bank (DO NOT duplicate or paraphrase closely):",
    ...(input.existingPromptLines.length === 0
      ? ["- (none yet)"]
      : input.existingPromptLines.slice(0, 80).map((line) => `- ${line}`)),
    "",
    input.chunkLibraryLines.length > 0
      ? "Existing chunks the bank already knows (prefer reusing these when they fit):"
      : null,
    ...input.chunkLibraryLines.slice(0, 60).map((line) => `- ${line}`),
    "",
    "Rules per part:",
    "- PART_1: short, direct, personal opinion / habit / preference questions (1-2 sentences each).",
    "- PART_2: cue cards. The prompt is 'Describe ...' and bullet_1..bullet_4 must each be a short follow-up bullet.",
    "- PART_3: abstract discussion questions tied to a Part 2 style theme (opinion, comparison, change over time, society impact, future).",
    "- MIXED: distribute across PART_1, PART_2, PART_3 with at least one of each when possible.",
    "",
    "Chunk usage roles must be one of:",
    "OPENING, OPINION, REASON, EXAMPLE, CONTRAST, DETAIL, EMOTION, STORYTELLING, SPECULATION, COMPARISON, ENDING, FILLER.",
    "",
    "Return strictly this JSON object:",
    "{",
    '  "questions": [',
    "    {",
    '      "part": "PART_1 | PART_2 | PART_3",',
    '      "topic": "string",',
    '      "subTopic": "string",',
    '      "prompt": "string",',
    '      "bullet_1": "string (only for PART_2; empty string otherwise)",',
    '      "bullet_2": "string",',
    '      "bullet_3": "string",',
    '      "bullet_4": "string",',
    '      "difficulty": 1-5,',
    '      "targetBand": number 4.0-9.0,',
    '      "recommendedChunks": ["string"],',
    '      "chunkRoles": ["OPENING" | "OPINION" | ...],',
    '      "popularityScore": 1-5,',
    '      "predictedUsefulnessScore": 1-5,',
    '      "aiReason": "Short Vietnamese explanation of why this is useful practice"',
    "    }",
    "  ]",
    "}",
    "",
    "Constraints:",
    "- recommendedChunks.length === chunkRoles.length when chunks are included.",
    "- Do not exceed 6 chunks per question.",
    "- popularityScore reflects how often this style of question shows up in past practice materials (1 = rare, 5 = very common).",
    "- predictedUsefulnessScore reflects how useful the practice is for the learner (1 = niche, 5 = high-value).",
    "- The model must not assert this is a real upcoming exam question.",
  ]);
}
