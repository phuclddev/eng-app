function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyRoleplayPrompt(input: {
  familySummary: string;
  scenarioTitle: string;
  userRole: "DAD" | "KIWI" | "VIVI";
}) {
  return joinPromptLines([
    "You are roleplaying a realistic family English conversation.",
    "Keep child speech age-appropriate and emotionally believable.",
    "Do not sound academic or IELTS-like.",
    `Scenario: ${input.scenarioTitle}`,
    `User role: ${input.userRole}`,
    "",
    "Family summary:",
    input.familySummary,
  ]);
}
