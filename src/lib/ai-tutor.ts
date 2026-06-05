import type {
  AiTutorPurpose,
  ExerciseType,
  IeltsQuestionRecord,
  PracticeExercise,
} from "@/lib/types";

const PRACTICE_AI_SUPPORTED_EXERCISE_TYPES: ExerciseType[] = [
  "REWRITE_SENTENCE",
  "CREATE_SENTENCE",
];

export function supportsPracticeExerciseAiTutor(exerciseType: ExerciseType) {
  return PRACTICE_AI_SUPPORTED_EXERCISE_TYPES.includes(exerciseType);
}

export function buildPracticeAiTutorMessage(
  exercise: Pick<
    PracticeExercise,
    "type" | "prompt" | "chunk" | "meaningVi" | "example" | "topic"
  >,
  userAnswer: string,
) {
  return [
    "Please review this IELTS Speaking practice answer.",
    `Exercise type: ${exercise.type}`,
    exercise.topic ? `Topic: ${exercise.topic}` : null,
    `Target chunk: ${exercise.chunk}`,
    `Vietnamese meaning: ${exercise.meaningVi}`,
    `Prompt: ${exercise.prompt}`,
    `Reference example: ${exercise.example}`,
    `My answer: ${userAnswer.trim()}`,
    "Please correct it if needed, explain briefly in Vietnamese, and show a more natural version using the chunk.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildQuestionAiTutorMessage(
  question: Pick<
    IeltsQuestionRecord,
    "taskType" | "topic" | "subTopic" | "prompt" | "recommendations"
  >,
) {
  const recommendedChunks =
    question.recommendations.length === 0
      ? "No mapped chunks yet."
      : question.recommendations
          .map((recommendation) => {
            const detail = [
              recommendation.chunk.chunk,
              `meaning: ${recommendation.chunk.meaningVi}`,
              `role: ${recommendation.usageRole}`,
            ];

            if (recommendation.exampleSentence) {
              detail.push(`example: ${recommendation.exampleSentence}`);
            }

            return `- ${detail.join(" | ")}`;
          })
          .join("\n");

  return [
    "Please coach me for this IELTS Speaking prompt.",
    `Speaking part: ${question.taskType}`,
    `Topic: ${question.topic}`,
    question.subTopic ? `Sub-topic: ${question.subTopic}` : null,
    `Prompt: ${question.prompt}`,
    "Recommended chunks:",
    recommendedChunks,
    "Please suggest a natural sample answer, explain how to use the chunks, and keep the feedback concise.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getAiTutorStarterPrompt(purpose: AiTutorPurpose) {
  switch (purpose) {
    case "SENTENCE_CORRECTION":
      return "Paste your sentence and ask for correction with chunk usage feedback.";
    case "SPEAKING_COACH":
      return "Ask for a concise IELTS Speaking sample answer, follow-up ideas, or chunk suggestions.";
    case "CHUNK_EXPLANATION":
      return "Ask how to use a chunk naturally in IELTS Speaking.";
    case "GENERAL_CHAT":
    default:
      return "Ask the tutor about IELTS Speaking, chunks, or answer improvement.";
  }
}
