function joinPromptLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

type RoleplayRole = "FATHER" | "MOTHER" | "KIWI" | "VIVI" | "GRANDPARENT";

const ROLE_LABELS: Record<RoleplayRole, string> = {
  FATHER: "Dad (Phuc)",
  MOTHER: "Mom",
  KIWI: "Kiwi",
  VIVI: "Vivi",
  GRANDPARENT: "Grandparent",
};

const ROLE_BEHAVIOR: Record<RoleplayRole, string> = {
  FATHER:
    "Calm, warm, slightly tired Vietnamese dad. Practical, occasionally firm. Speaks natural daily English.",
  MOTHER:
    "Caring Vietnamese mom. Gentle but able to push back. Mixes English and Vietnamese phrasing patterns.",
  KIWI:
    "Almost-6-year-old twin daughter. Curious, sensitive, competitive, sometimes whiny. Uses simple short English sentences and short questions like 'Can I…?' / 'Why?' / 'But I want it!' Reacts emotionally. Loves attention.",
  VIVI:
    "Almost-6-year-old twin daughter. Playful, relaxed, sometimes stubborn or distracted. Talks in short bursts. May get silly, may avoid or change topics. Lower energy than Kiwi.",
  GRANDPARENT:
    "Older Vietnamese grandparent who speaks gently in simple English. Often nostalgic, caring, slightly slower paced. Sometimes mixes basic Vietnamese politeness.",
};

const TARGET_LEVEL_GUIDANCE: Record<string, string> = {
  BASIC:
    "Stay with short, simple sentences for the child characters. Avoid idioms. Use very common verbs.",
  NATURAL:
    "Use natural daily English with a few useful chunks. Keep child speech believable for almost-6-year-olds.",
  ADVANCED:
    "Use slightly richer family English including conversational chunks, but keep child speech age-appropriate.",
};

function describeRole(role: RoleplayRole) {
  return `${ROLE_LABELS[role]} — ${ROLE_BEHAVIOR[role]}`;
}

export function buildFamilyRoleplayStartPrompt(input: {
  familySummary: string;
  aiRole: RoleplayRole;
  userRole: RoleplayRole;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  targetLevel: "BASIC" | "NATURAL" | "ADVANCED";
  scenarioTitle: string | null;
  scenarioCategory: string | null;
  scenarioDescription: string | null;
  turnsLimit: number;
}) {
  return joinPromptLines([
    "You are roleplaying a single character in a realistic daily family English conversation for Phuc and his family.",
    "Stay in character at all times. Do not narrate. Do not break character.",
    "Avoid IELTS-style or academic phrasing.",
    "Never list multiple options. Send only one short message per turn, like a real chat.",
    "Keep your message under 3 sentences when possible.",
    "Children must sound like almost-6-year-olds, not adults.",
    "Use natural daily-life chunks when they fit, but do not stuff chunks unnaturally.",
    "Send your reply as plain text only — no Markdown headings, no JSON.",
    "",
    `Your role (AI character): ${describeRole(input.aiRole)}`,
    `Phuc's role (user): ${describeRole(input.userRole)}`,
    `Child focus: ${input.childFocus}`,
    `Target level: ${input.targetLevel}`,
    `Target level guidance: ${TARGET_LEVEL_GUIDANCE[input.targetLevel] ?? TARGET_LEVEL_GUIDANCE.NATURAL}`,
    `Turns planned: about ${input.turnsLimit} exchanges before Phuc ends the session.`,
    "",
    input.scenarioTitle
      ? `Scenario title: ${input.scenarioTitle}`
      : "Scenario: improvised daily family interaction.",
    input.scenarioCategory
      ? `Scenario category: ${input.scenarioCategory}`
      : null,
    input.scenarioDescription
      ? `Scenario description: ${input.scenarioDescription}`
      : null,
    "",
    "Family summary (private context, do not echo back literally):",
    input.familySummary,
    "",
    `Now open the conversation as ${ROLE_LABELS[input.aiRole]} would naturally start it. Speak first, in character.`,
  ]);
}

export function buildFamilyRoleplayTurnPrompt(input: {
  aiRole: RoleplayRole;
  userRole: RoleplayRole;
  childFocus: "KIWI" | "VIVI" | "BOTH";
  targetLevel: "BASIC" | "NATURAL" | "ADVANCED";
  learnerMessage: string;
  turnNumber: number;
  turnsLimit: number;
}) {
  return joinPromptLines([
    `You are still playing ${describeRole(input.aiRole)}.`,
    "Stay in character. Do not break role.",
    "Reply in plain text only. No Markdown headings.",
    "Keep the reply short and natural — one or two sentences is usually best.",
    "Match the emotion and age. Never sound like an adult coach or examiner.",
    "Avoid academic or IELTS-style phrasing.",
    "Use natural family English chunks when they fit.",
    "If the previous user message is rude, abusive, or off-topic, gently redirect in character without breaking it.",
    "",
    `User just said (as ${ROLE_LABELS[input.userRole]}):`,
    input.learnerMessage,
    "",
    `This is turn ${input.turnNumber} of about ${input.turnsLimit}.`,
    "Reply as your character would naturally reply next.",
  ]);
}

export function buildFamilyRoleplayFinishPrompt(input: {
  aiRole: RoleplayRole;
  userRole: RoleplayRole;
  targetLevel: "BASIC" | "NATURAL" | "ADVANCED";
  transcript: string;
}) {
  return joinPromptLines([
    "The family roleplay has ended. You are now a warm Vietnamese family English coach reviewing the transcript.",
    "Speak directly to Phuc. Mix concise Vietnamese explanations with English example phrases.",
    "Highlight useful family English chunks in **bold**.",
    "Do not act in character anymore.",
    "Return Markdown only — no raw HTML.",
    "",
    `Phuc played: ${ROLE_LABELS[input.userRole]}`,
    `AI played: ${ROLE_LABELS[input.aiRole]}`,
    `Target level: ${input.targetLevel}`,
    "",
    "Transcript:",
    input.transcript,
    "",
    "Reply with these Markdown sections in this exact order:",
    "# Overall Feedback",
    "# Better Phrases You Could Use",
    "# Useful Family Chunks",
    "# What You Did Well",
    "# Next Practice Suggestion",
  ]);
}
