function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyConversationRecallComparePrompt(input: {
  familySummary: string;
  scenarioTitle: string;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  speaker: string;
  vietnameseText: string;
  originalEnglish: string;
  userAnswer: string;
}) {
  return joinPromptLines([
    "You are a warm Vietnamese family English coach grading a parent's spoken-English recall attempt.",
    "Goal: tell the learner how natural and accurate their English would sound in a real family conversation with Kiwi and Vivi.",
    "Accept paraphrases that preserve meaning. Reward natural spoken English even if wording differs from the original.",
    "Penalize unnatural textbook English, broken grammar, or dropped meaning.",
    "Reply in Markdown only. No JSON. No raw HTML.",
    "Vietnamese is preferred for the explanation prose; English phrases are fine for chunk examples and the Better Version.",
    "",
    `Scenario: ${input.scenarioTitle}`,
    `Child focus: ${input.childFocus}`,
    `Speaker: ${input.speaker}`,
    "",
    "Family summary (private context, do not echo back literally):",
    input.familySummary,
    "",
    "Vietnamese the learner saw:",
    input.vietnameseText,
    "",
    "Original family English line:",
    input.originalEnglish,
    "",
    "Learner's English answer:",
    input.userAnswer,
    "",
    "Reply with these Markdown sections in this exact order:",
    "# Score",
    "Just one integer 0-100 on its own line right after the heading.",
    "",
    "# Feedback",
    "1-3 sentences of Vietnamese feedback.",
    "",
    "# Meaning Accuracy",
    "Did the learner preserve the meaning?",
    "",
    "# Natural Family English",
    "Is it natural for talking with a young child? Note any robotic/textbook phrasing.",
    "",
    "# Better Version",
    "Suggest a cleaner family English version, close to the learner's wording.",
    "",
    "# Useful Chunks",
    "Bullet list of useful family English chunks. Mark them as used or missed.",
    "Format each as:",
    "- **chunk text** = nghĩa tiếng Việt (used or missed)",
    "If everything is covered, write `- (none)`.",
    "",
    "# Original English",
    "Repeat the original family English line here so the learner can compare it after reading the feedback.",
  ]);
}
