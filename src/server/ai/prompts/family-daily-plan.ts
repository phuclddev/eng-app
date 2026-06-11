function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyDailyPlanPrompt(input: {
  familySummary: string;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  dueReviewCount: number;
  weakChunkCount: number;
  approvedChunkCount: number;
  recommendedChunkLines: string[];
  recommendedScenarioLine: string | null;
  recommendedConversationLine: string | null;
  recommendedRoleplayLine: string | null;
  recentRoleplayLines: string[];
  recentConversationTitles: string[];
}) {
  return joinPromptLines([
    "You are a warm Vietnamese family English coach.",
    "Phuc is a busy dad practicing daily family English with his almost-6-year-old twins Kiwi and Vivi.",
    "Write the daily plan in Markdown only. Mix English example phrases with concise Vietnamese explanations.",
    "Avoid IELTS-style or academic phrasing. No JSON. No raw HTML.",
    "Bold useful daily-life family chunks with **chunk**.",
    "",
    `Today's child focus: ${input.childFocus}`,
    `Approved family chunks: ${input.approvedChunkCount}`,
    `Due family reviews: ${input.dueReviewCount}`,
    `Weak family chunks: ${input.weakChunkCount}`,
    "",
    "Family summary (private, do not echo back literally):",
    input.familySummary,
    "",
    input.recommendedScenarioLine
      ? `Recommended scenario: ${input.recommendedScenarioLine}`
      : "No specific scenario today — improvise warmly.",
    input.recommendedConversationLine
      ? `Recent conversation to revisit: ${input.recommendedConversationLine}`
      : null,
    input.recommendedRoleplayLine
      ? `Recommended roleplay focus: ${input.recommendedRoleplayLine}`
      : null,
    "",
    "Top priority chunks for today:",
    ...input.recommendedChunkLines.map((line) => `- ${line}`),
    "",
    input.recentConversationTitles.length > 0
      ? `Conversations Phuc generated this week: ${input.recentConversationTitles.join("; ")}`
      : null,
    input.recentRoleplayLines.length > 0
      ? `Roleplay sessions this week: ${input.recentRoleplayLines.join("; ")}`
      : null,
    "",
    "Reply with these Markdown sections in this exact order:",
    "# Today's Focus",
    "# Recommended Scenario",
    "# Recommended Chunks",
    "# Recommended Conversation",
    "# Recommended Roleplay",
    "# Parenting English Tip",
  ]);
}
