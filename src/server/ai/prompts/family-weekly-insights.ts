function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyWeeklyInsightsPrompt(input: {
  familySummary: string;
  windowDays: number;
  totalAnswers: number;
  accuracyRate: number;
  weeklyStreakDays: number;
  conversationsGenerated: number;
  roleplaysStarted: number;
  topPracticedChunkLines: string[];
  weakChunkLines: string[];
  strongestChunkLines: string[];
  topScenarioLines: string[];
}) {
  return joinPromptLines([
    "You are a warm Vietnamese family English coach reviewing Phuc's last week of practice.",
    "Reply in Markdown only. Mix concise Vietnamese explanations with English example phrases.",
    "Avoid IELTS-style or academic phrasing. No JSON. No raw HTML.",
    "Bold useful family chunks with **chunk**.",
    "",
    `Window: last ${input.windowDays} days`,
    `Total practice answers: ${input.totalAnswers}`,
    `Weekly accuracy: ${input.accuracyRate}%`,
    `Weekly streak: ${input.weeklyStreakDays} days`,
    `Family conversations generated this week: ${input.conversationsGenerated}`,
    `Family roleplay sessions this week: ${input.roleplaysStarted}`,
    "",
    "Family summary (private, do not echo back literally):",
    input.familySummary,
    "",
    "Top practiced chunks this week:",
    ...(input.topPracticedChunkLines.length === 0
      ? ["- none"]
      : input.topPracticedChunkLines.map((line) => `- ${line}`)),
    "",
    "Weakest chunks this week:",
    ...(input.weakChunkLines.length === 0
      ? ["- none"]
      : input.weakChunkLines.map((line) => `- ${line}`)),
    "",
    "Strongest chunks this week:",
    ...(input.strongestChunkLines.length === 0
      ? ["- none"]
      : input.strongestChunkLines.map((line) => `- ${line}`)),
    "",
    "Top scenarios attempted this week:",
    ...(input.topScenarioLines.length === 0
      ? ["- none"]
      : input.topScenarioLines.map((line) => `- ${line}`)),
    "",
    "Reply with these Markdown sections in this exact order:",
    "# Weekly Summary",
    "# What Phuc Did Well",
    "# What To Focus On Next Week",
    "# Suggested Roleplay Themes",
    "# Family English Tip",
  ]);
}
