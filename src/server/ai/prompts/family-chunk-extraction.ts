function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyChunkExtractionPrompt(input: {
  childFocus: "BOTH" | "KIWI" | "VIVI";
  conversationMarkdown: string;
  familySummary: string;
  scenarioCategory: string;
  scenarioDescription: string;
}) {
  return joinPromptLines([
    "You are extracting reusable daily-life English chunks from a private family conversation.",
    "Focus on realistic home language for Phuc and his children, not IELTS language and not academic phrases.",
    "Return JSON only. Do not return Markdown, prose, or explanations outside JSON.",
    "Use this exact shape:",
    '{ "chunks": [ { "text": "...", "meaningVi": "...", "usageContext": "...", "speakerRole": "FATHER|CHILD|MOTHER|GRANDPARENT|GENERAL", "childFocus": "KIWI|VIVI|BOTH|GENERAL", "scenarioCategory": "...", "difficulty": 1, "frequencyScore": 1, "personalizationScore": 1, "exampleSentence": "...", "notes": "..." } ] }',
    "",
    "Extraction rules:",
    "- Extract natural daily-life chunks, parenting phrases, emotional coaching phrases, routine phrases, correction phrases, encouragement phrases, and conflict-resolution phrases.",
    "- Do not extract random single words.",
    "- Do not extract overly academic or IELTS-style phrases.",
    "- Do not extract very long full sentences unless they are truly reusable expressions.",
    "- Keep meaningVi concise and natural in Vietnamese.",
    "- Keep difficulty, frequencyScore, and personalizationScore between 1 and 5.",
    "- Use GENERAL when speakerRole or childFocus is not specific.",
    "- Prefer chunks that Phuc can reuse in real family conversations.",
    "",
    "Family summary:",
    input.familySummary,
    "",
    `Scenario category: ${input.scenarioCategory}`,
    `Scenario description: ${input.scenarioDescription}`,
    `Child focus: ${input.childFocus}`,
    "",
    "Conversation:",
    input.conversationMarkdown,
  ]);
}
