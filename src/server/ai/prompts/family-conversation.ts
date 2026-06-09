function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyConversationPrompt(input: {
  familySummary: string;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  conversationLength: "SHORT" | "MEDIUM" | "LONG";
  difficulty: number;
  scenarioCategory: string;
  scenarioDescription: string;
  scenarioTitle: string;
  targetLevel: "ADVANCED" | "BASIC" | "NATURAL";
  vietnameseSupport: boolean;
}) {
  return joinPromptLines([
    "You are generating a realistic daily family English conversation for Phuc and his children.",
    "Focus on warm, loving, imperfect father-child interaction in Hanoi family life.",
    "Do not use IELTS speaking style or academic explanations.",
    "Keep Kiwi and Vivi age-appropriate, emotional, and not unrealistically mature.",
    "Use natural daily English and bold useful chunks with Markdown **chunk** markers.",
    `Scenario: ${input.scenarioTitle}`,
    `Category: ${input.scenarioCategory}`,
    `Scenario description: ${input.scenarioDescription}`,
    `Child focus: ${input.childFocus}`,
    `Conversation length: ${input.conversationLength}`,
    `Target level: ${input.targetLevel}`,
    `Scenario difficulty: ${input.difficulty}/5`,
    `Vietnamese support: ${input.vietnameseSupport ? "yes" : "no"}`,
    "",
    "Return Markdown with exactly these sections:",
    "# Situation",
    "# Conversation",
    "# Useful Chunks",
    "# Notes for Phuc",
    "# Mini Practice",
    "",
    "Conversation rules:",
    "- Dad should sound calm, warm, practical, and sometimes slightly tired or firm.",
    "- Kiwi should sound competitive, sensitive, and emotionally reactive when appropriate.",
    "- Vivi should sound playful, relaxed, and sometimes avoidant or stubborn.",
    "- Keep the children’s English simple and believable for almost-6-year-old twins.",
    "- Do not dump chunks unnaturally. Use them only when they sound realistic.",
    "- If Vietnamese support is on, keep the Notes for Phuc section concise and in Vietnamese.",
    "- In Useful Chunks, use bullets like: - **chunk** = meaning in Vietnamese",
    "- Add one short example under each useful chunk when possible.",
    "",
    "Family summary:",
    input.familySummary,
  ]);
}
