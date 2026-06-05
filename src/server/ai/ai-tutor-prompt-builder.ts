import type {
  AiTutorPurpose,
  AiTutorSpeakingAnswerContext,
} from "@/lib/types";

function buildPurposeGuidance(purpose: AiTutorPurpose) {
  switch (purpose) {
    case "SENTENCE_CORRECTION":
      return [
        "Purpose: sentence correction for IELTS Speaking chunk practice.",
        "Correct grammar, word choice, and chunk placement naturally.",
      ].join("\n");
    case "SPEAKING_COACH":
      return [
        "Purpose: speaking coach for IELTS Speaking prompts.",
        "Suggest concise, practical coaching for real IELTS Speaking answers.",
      ].join("\n");
    case "CHUNK_EXPLANATION":
      return [
        "Purpose: explain chunk meaning and natural usage for IELTS Speaking.",
        "Contrast natural and unnatural usage briefly when helpful.",
      ].join("\n");
    case "GENERAL_CHAT":
    default:
      return "Purpose: general IELTS Speaking tutoring and chunk guidance.";
  }
}

function buildSpeakingAnswerCorrectionPrompt(context: AiTutorSpeakingAnswerContext) {
  const chunkSummary =
    context.recommendedChunks.length === 0
      ? "No mapped chunks yet."
      : context.recommendedChunks
          .map((item) => {
            const details = [item.chunk];

            if (item.meaningVi) {
              details.push(`meaning: ${item.meaningVi}`);
            }

            if (item.usageRole) {
              details.push(`role: ${item.usageRole}`);
            }

            if (item.exampleSentence) {
              details.push(`example: ${item.exampleSentence}`);
            }

            return `- ${details.join(" | ")}`;
          })
          .join("\n");

  return [
    "You are reviewing a learner's IELTS Speaking answer.",
    `Speaking part: ${context.speakingPart}`,
    `Topic: ${context.topic}`,
    context.subTopic ? `Sub-topic: ${context.subTopic}` : null,
    `Prompt: ${context.prompt}`,
    "Recommended chunks:",
    chunkSummary,
    `Learner answer: ${context.userAnswer.trim()}`,
    "Return the response using exactly these section headings in order:",
    "1. Overall feedback",
    "2. Grammar fixes",
    "3. Naturalness",
    "4. Chunk usage",
    "5. Better version",
    "6. Suggested chunks",
    "7. Next practice task",
    "Keep each section concise.",
    "Explain in Vietnamese when useful, but keep strong English examples in English.",
    "If the answer is already good, still fill all sections briefly.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAiTutorQuery({
  message,
  purpose,
  context,
}: {
  message: string;
  purpose: AiTutorPurpose;
  context?: AiTutorSpeakingAnswerContext;
}) {
  return [
    "You are AI Tutor inside an IELTS Speaking chunk training app.",
    "Focus on IELTS Speaking only.",
    "Keep answers concise and practical.",
    "Explain in Vietnamese when useful, but preserve strong English examples.",
    "Suggest chunks naturally instead of forcing them.",
    "Avoid overly long answers and avoid generic filler.",
    buildPurposeGuidance(purpose),
    "",
    context?.kind === "SPEAKING_ANSWER_REVIEW"
      ? buildSpeakingAnswerCorrectionPrompt(context)
      : ["User request:", message.trim()].join("\n"),
  ].join("\n");
}
