function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

const HIGH_UTILITY_IDEA_SEEDS = [
  "Convenience / saving time",
  "Better communication",
  "Personal development",
  "Stress reduction",
  "Cost saving",
  "Wider choice",
  "Flexibility",
  "Safety",
  "Health benefits",
  "Environmental protection",
  "Social connection",
  "Learning efficiency",
  "Building confidence",
  "Independence",
  "Creativity",
];

export function buildIeltsSpeakingIdeaGeneratorPrompt(input: {
  topic?: string | null;
  count: number;
  targetBand: number;
  includeExistingContext: boolean;
  existingIdeaLines: string[];
}) {
  return joinPromptLines([
    "You are an expert IELTS Speaking curriculum designer.",
    "Generate reusable CORE IDEAS, not individual IELTS questions.",
    "Each idea should work across many IELTS Speaking prompts and topics.",
    "Focus on high-utility thinking patterns such as convenience, stress reduction, cost saving, confidence, flexibility, learning, safety, environmental impact, and social connection.",
    "Return STRICT JSON only. No Markdown fences. No commentary outside the JSON object.",
    "",
    input.topic
      ? `Topic preference: ${input.topic}. Keep the ideas especially reusable for this topic cluster while still broadly transferable.`
      : "Vary across broadly reusable IELTS Speaking themes.",
    `Generate ${input.count} ideas.`,
    `Target band guidance: ${input.targetBand}.`,
    "The ideas should sound useful for IELTS Speaking answers, but they must stay reusable and not tied to one exact prompt.",
    "",
    "Seed examples of the kind of core ideas we want:",
    ...HIGH_UTILITY_IDEA_SEEDS.map((idea) => `- ${idea}`),
    "",
    input.includeExistingContext
      ? "Existing ideas already in the bank. Avoid duplicates or near-duplicates by title, short label, or meaning:"
      : null,
    ...(input.includeExistingContext
      ? input.existingIdeaLines.slice(0, 80).map((line) => `- ${line}`)
      : []),
    "",
    "Rules:",
    "- Prefer reusable reasoning that can fit multiple parts of IELTS Speaking.",
    "- Avoid narrow one-off ideas tied to a single question only.",
    "- Avoid copying the existing ideas list.",
    "- Vietnamese descriptions should help an admin understand how the idea is used.",
    "- English descriptions should explain the reusable speaking logic naturally.",
    "- Variants should reflect different band levels or phrase sophistication.",
    "- Supports should include reasons, examples, results, contrasts, details, or personal experience angles.",
    "- Patterns should be reusable answer skeletons, not full memorized speeches.",
    "- exampleQuestions should be short sample prompts the idea can answer well, but these are examples only and must not become mappings automatically.",
    "",
    "Return strictly this JSON object:",
    "{",
    '  "ideas": [',
    "    {",
    '      "title": "string",',
    '      "shortLabel": "string",',
    '      "descriptionVi": "string",',
    '      "descriptionEn": "string",',
    '      "popularityScore": 1-5,',
    '      "reuseScore": 1-5,',
    '      "variants": [',
    "        {",
    '          "bandLevel": 6.0,',
    '          "phrase": "string",',
    '          "exampleSentence": "string"',
    "        }",
    "      ],",
    '      "supports": [',
    "        {",
    '          "supportType": "REASON | EXAMPLE | RESULT | CONTRAST | DETAIL | PERSONAL_EXPERIENCE",',
    '          "text": "string",',
    '          "example": "string"',
    "        }",
    "      ],",
    '      "patterns": [',
    "        {",
    '          "patternText": "string",',
    '          "exampleAnswer": "string"',
    "        }",
    "      ],",
    '      "exampleQuestions": ["string"],',
    '      "aiReason": "Short Vietnamese explanation of why this idea is reusable and high-value"',
    "    }",
    "  ]",
    "}",
    "",
    "Constraints:",
    "- popularityScore = how common this idea is across IELTS Speaking topics.",
    "- reuseScore = how broadly reusable the idea is across different prompts.",
    "- Keep variants to 1-3 items.",
    "- Keep supports to 2-5 items.",
    "- Keep patterns to 1-3 items.",
    "- Keep exampleQuestions to 1-4 items.",
    "- Do not include any field other than the specified JSON structure.",
  ]);
}
