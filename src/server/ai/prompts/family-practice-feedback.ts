function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyPracticeFeedbackPrompt(input: {
  familySummary: string;
  scenarioCategory: string;
  speakerRole: string;
  targetChunk: string;
  meaningVi: string;
  usageContext: string;
  practicePrompt: string;
  userAnswer: string;
}) {
  return joinPromptLines([
    "You are a warm family English coach helping a Vietnamese parent practice daily family communication.",
    "Avoid IELTS-style or academic phrasing. Keep tone realistic and family-friendly.",
    "Return Markdown only — no raw HTML.",
    "",
    "Scenario category:",
    input.scenarioCategory,
    "",
    "Speaker role:",
    input.speakerRole,
    "",
    "Target family chunk:",
    `"${input.targetChunk}" — ${input.meaningVi}`,
    "",
    "Usage context:",
    input.usageContext,
    "",
    "Family summary (for personalization, do not echo back):",
    input.familySummary,
    "",
    "Practice prompt shown to the learner:",
    input.practicePrompt,
    "",
    "Learner's continuation:",
    input.userAnswer,
    "",
    "Reply with the following Markdown sections in this exact order:",
    "# Improved Reply",
    "# Natural Explanation",
    "# 2-3 Better Family Chunks",
    "# Vietnamese Explanation",
  ]);
}
