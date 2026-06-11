function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

const SCENARIO_THEMES = [
  "morning routine",
  "car rides",
  "phone requests",
  "cartoons (Sonic, Vivi favorites)",
  "homework resistance",
  "writing practice",
  "tooth brushing",
  "bedtime",
  "fear of ghosts",
  "Kiwi losing chess",
  "Vivi refusing medicine",
  "messy toys",
  "playground visits",
  "grandparents",
  "weekend outings",
  "English practice",
  "emotional coaching",
  "sibling conflict",
];

const FORBIDDEN_THEMES = [
  "unrealistic perfect-child behavior",
  "overly dramatic or scary events",
  "unsafe situations or accidents",
  "IELTS-style or academic topics",
  "generic textbook 'My family' essays",
];

export function buildFamilyScenarioGeneratorPrompt(input: {
  familySummary: string;
  count: number;
  childFocus?: "KIWI" | "VIVI" | "BOTH" | "GENERAL";
  category?: string;
  existingScenarioLines: string[];
}) {
  return joinPromptLines([
    "You are a warm Vietnamese family English coach generating realistic daily scenarios for Phuc's family practice.",
    "Return STRICT JSON only. No Markdown fences. No commentary outside the JSON object.",
    "Each scenario must be grounded in real family life — not academic, not unrealistic, not unsafe.",
    "Prefer concrete situations: who is involved, what is happening, what emotion is present.",
    "Write Vietnamese explanations in aiReason. Title, description, suggestedGoals, and suggestedChunks stay in English.",
    "Bold useful chunks naturally inside suggestedChunks (they must be short, reusable English phrases — not full sentences).",
    "",
    `Generate ${input.count} scenarios.`,
    input.childFocus
      ? `Child focus preference: ${input.childFocus}.`
      : "Mix child focus across Kiwi, Vivi, and both.",
    input.category
      ? `Category preference: ${input.category}.`
      : "Vary the category across morning, meals, bedtime, school, conflict, emotional coaching, outings, etc.",
    "",
    "Family summary (private context, do not echo back literally):",
    input.familySummary,
    "",
    "Theme palette (pick varied themes, do not just repeat the list):",
    ...SCENARIO_THEMES.map((theme) => `- ${theme}`),
    "",
    "Avoid these patterns:",
    ...FORBIDDEN_THEMES.map((pattern) => `- ${pattern}`),
    "",
    input.existingScenarioLines.length > 0
      ? "Scenarios that already exist for this user (DO NOT duplicate titles or near-duplicates):"
      : null,
    ...input.existingScenarioLines.map((line) => `- ${line}`),
    "",
    "Each scenario object must include:",
    "- title: string, 4 to 12 words, concrete (e.g. 'Kiwi losing a chess match before bedtime')",
    "- category: short string (e.g. 'Bedtime', 'Conflict', 'Routine', 'Emotional Coaching')",
    "- childFocus: one of 'KIWI', 'VIVI', 'BOTH', 'GENERAL'",
    "- description: 2-4 sentences in English, realistic and warm",
    "- difficulty: integer 1-5 (1 = easy daily small talk, 5 = tense emotional conversation)",
    "- suggestedGoals: 2-4 short English bullet phrases of what Phuc should achieve in the conversation",
    "- suggestedChunks: 3-6 short reusable English chunks the conversation should use",
    "- aiReason: 1-2 sentences in Vietnamese explaining why this scenario is useful for Phuc's family",
    "",
    "Return strictly this JSON object:",
    "{",
    '  "scenarios": [',
    "    {",
    '      "title": "string",',
    '      "category": "string",',
    '      "childFocus": "KIWI | VIVI | BOTH | GENERAL",',
    '      "description": "string",',
    '      "difficulty": 1-5,',
    '      "suggestedGoals": ["string"],',
    '      "suggestedChunks": ["string"],',
    '      "aiReason": "Vietnamese explanation"',
    "    }",
    "  ]",
    "}",
  ]);
}
