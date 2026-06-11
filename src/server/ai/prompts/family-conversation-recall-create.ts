function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildFamilyConversationRecallCreatePrompt(input: {
  familySummary: string;
  scenarioTitle: string;
  scenarioCategory: string;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  conversationMarkdown: string;
}) {
  return joinPromptLines([
    "You are an AI helper preparing a Vietnamese-English recall practice from a saved family English conversation.",
    "Parse the conversation Markdown into clean speaker lines, then translate each English line into natural Vietnamese.",
    "Return STRICT JSON only. No Markdown fences. No commentary outside the JSON object.",
    "Preserve speaker labels (Dad, Mom, Kiwi, Vivi, Grandma, etc.). Skip narration, section headings, and chunk lists.",
    "Each line must be one short conversational turn (1-3 sentences max).",
    "Vietnamese translations should sound natural, not literal. Keep parent-child warmth.",
    "Identify the most useful daily-life chunks per line where helpful.",
    "",
    `Scenario: ${input.scenarioTitle}`,
    `Category: ${input.scenarioCategory}`,
    `Child focus: ${input.childFocus}`,
    "",
    "Family summary (private context, do not echo back literally):",
    input.familySummary,
    "",
    "Conversation Markdown:",
    input.conversationMarkdown,
    "",
    "Return strictly this JSON object:",
    "{",
    '  "lines": [',
    "    {",
    '      "speaker": "string (e.g. Dad, Kiwi)",',
    '      "englishText": "string (the original English line)",',
    '      "vietnameseText": "string (natural Vietnamese)",',
    '      "usedChunks": ["string"]',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- 4-30 lines total.",
    "- Lines must be in original order.",
    "- usedChunks is optional per line and capped at 5 short chunks.",
    "- Do not include speaker bullets like `Dad:`; speaker goes in the speaker field, the line text goes in englishText.",
    "- Do not invent lines that are not in the conversation.",
  ]);
}
