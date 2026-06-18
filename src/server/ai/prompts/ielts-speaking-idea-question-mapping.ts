import type { SpeakingIdeaOption } from "@/lib/types";

function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

export function buildQuestionToIdeasPrompt(input: {
  question: {
    taskType: string;
    topic: string;
    subTopic: string | null;
    prompt: string;
    targetBand: number;
    supportingPoints: string[];
  };
  ideaLines: string[];
  limit: number;
}) {
  return joinPromptLines([
    "You are an IELTS Speaking curriculum designer.",
    "Given one IELTS Speaking question and a list of reusable speaking ideas, pick the best idea matches.",
    "Return STRICT JSON only.",
    "",
    `Question part: ${input.question.taskType}`,
    `Topic: ${input.question.topic}`,
    input.question.subTopic ? `Sub-topic: ${input.question.subTopic}` : null,
    `Prompt: ${input.question.prompt}`,
    `Target band: ${input.question.targetBand}`,
    input.question.supportingPoints.length > 0
      ? `Supporting points: ${input.question.supportingPoints.join(" | ")}`
      : null,
    "",
    "Candidate reusable ideas:",
    ...input.ideaLines.map((line) => `- ${line}`),
    "",
    `Return up to ${input.limit} suggestions in this JSON shape:`,
    "{",
    '  "suggestions": [',
    "    {",
    '      "ideaId": "string",',
    '      "relevanceScore": 1-5,',
    '      "isPrimary": true,',
    '      "aiReason": "Short Vietnamese explanation"',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Prefer broadly reusable ideas, not narrow topic-only matches.",
    "- Suggest at most one primary idea.",
    "- Do not invent ids outside the candidate list.",
  ]);
}

export function buildIdeaToQuestionsPrompt(input: {
  idea: SpeakingIdeaOption & {
    descriptionVi: string;
    descriptionEn: string;
    variants: string[];
    supports: string[];
  };
  questionLines: string[];
  limit: number;
}) {
  return joinPromptLines([
    "You are an IELTS Speaking curriculum designer.",
    "Given one reusable speaking idea and a bank of IELTS Speaking questions, choose the best question matches.",
    "Return STRICT JSON only.",
    "",
    `Idea title: ${input.idea.title}`,
    `Short label: ${input.idea.shortLabel}`,
    `Reuse score: ${input.idea.reuseScore}`,
    `Popularity score: ${input.idea.popularityScore}`,
    `Vietnamese description: ${input.idea.descriptionVi}`,
    `English description: ${input.idea.descriptionEn}`,
    input.idea.variants.length > 0 ? `Variants: ${input.idea.variants.join(" | ")}` : null,
    input.idea.supports.length > 0 ? `Support angles: ${input.idea.supports.join(" | ")}` : null,
    "",
    "Candidate IELTS Speaking questions:",
    ...input.questionLines.map((line) => `- ${line}`),
    "",
    `Return up to ${input.limit} suggestions in this JSON shape:`,
    "{",
    '  "suggestions": [',
    "    {",
    '      "questionId": "string",',
    '      "relevanceScore": 1-5,',
    '      "isPrimary": true,',
    '      "aiReason": "Short Vietnamese explanation"',
    "    }",
    "  ]",
    "}",
    "",
    "Rules:",
    "- Suggest questions the idea can answer naturally and repeatedly.",
    "- Suggest at most one primary question.",
    "- Do not invent ids outside the candidate list.",
  ]);
}
