function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildTranslationRecallComparePrompt(input: {
  mode: "SENTENCE" | "PASSAGE";
  scriptTitle: string;
  topic: string;
  bandLevel: number;
  vietnameseSource: string;
  originalEnglish: string;
  userAnswer: string;
}) {
  const granularity =
    input.mode === "SENTENCE"
      ? "a single sentence pair (one Vietnamese, one user English answer)"
      : "a whole passage (multiple Vietnamese sentences, one full user English answer)";

  return joinPromptLines([
    "You are an IELTS Speaking practice coach evaluating a Vietnamese-to-English translation attempt.",
    `Grading granularity: ${granularity}.`,
    "Goal: tell the learner how close their English answer is to a natural IELTS Speaking response in Vietnamese.",
    "Accept paraphrases that preserve meaning. Do not punish harmless wording differences.",
    "Penalize when the answer drops meaning, breaks grammar, sounds unnatural, or misses useful IELTS Speaking chunks.",
    "Bold useful English chunks with Markdown (**chunk**) so the learner can spot them.",
    "Reply in Markdown only. No JSON. No raw HTML.",
    "Vietnamese is preferred for the explanatory prose. Keep English phrases for the chunk examples and the Better Version.",
    "",
    `Script title: ${input.scriptTitle}`,
    `Topic: ${input.topic}`,
    `Target band: ${input.bandLevel}`,
    "",
    "Vietnamese source the learner saw:",
    input.vietnameseSource,
    "",
    "Original English answer in the script (use as a reference, not as the only correct answer):",
    input.originalEnglish,
    "",
    "Learner's English answer:",
    input.userAnswer,
    "",
    "Reply with these Markdown sections in this exact order:",
    "# Score",
    "Just one integer 0-100 on its own line right after the heading.",
    "",
    "# Overall Feedback",
    "1-3 sentences of Vietnamese feedback summarizing the attempt.",
    "",
    "# Meaning Accuracy",
    "Did the learner preserve the meaning? Mention key ideas kept or dropped.",
    "",
    "# Grammar & Naturalness",
    "Quick grammar / collocation / spoken-English notes.",
    "",
    "# Missing Chunks",
    "Bullet list of useful English chunks the original answer used that the learner did not use. Format each as:",
    "- **chunk text** = nghĩa tiếng Việt",
    "If the learner used all important chunks, write `- (none)`.",
    "",
    "# Better Version",
    "Suggest a cleaner version close to the learner's wording. Keep their voice.",
    "",
    "# Original Answer",
    "Repeat the original English answer here so the learner can compare it after reading the feedback.",
  ]);
}
