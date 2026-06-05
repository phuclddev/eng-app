import type {
  AiTutorRecommendedChunkContext,
  AiTutorPurpose,
  AiTutorSpeakingAnswerContext,
  AiTutorStructuredFeedbackSection,
  ChunkRecord,
  ExerciseType,
  IeltsQuestionRecord,
  PracticeExercise,
} from "@/lib/types";

const PRACTICE_AI_SUPPORTED_EXERCISE_TYPES: ExerciseType[] = [
  "REWRITE_SENTENCE",
  "CREATE_SENTENCE",
];

export const AI_TUTOR_STRUCTURED_FEEDBACK_SECTIONS: Array<{
  key: AiTutorStructuredFeedbackSection["key"];
  title: AiTutorStructuredFeedbackSection["title"];
}> = [
  { key: "overallFeedback", title: "Overall feedback" },
  { key: "grammarFixes", title: "Grammar fixes" },
  { key: "naturalness", title: "Naturalness" },
  { key: "chunkUsage", title: "Chunk usage" },
  { key: "betterVersion", title: "Better version" },
  { key: "suggestedChunks", title: "Suggested chunks" },
  { key: "nextPracticeTask", title: "Next practice task" },
] as const;

export const AI_CHUNK_COACH_SECTIONS: Array<{
  key: AiTutorStructuredFeedbackSection["key"];
  title: AiTutorStructuredFeedbackSection["title"];
}> = [
  { key: "meaningInVietnamese", title: "Meaning in Vietnamese" },
  { key: "whenToUse", title: "When to use it" },
  { key: "whenNotToUse", title: "When not to use it" },
  { key: "ieltsSpeakingContext", title: "IELTS Speaking context" },
  { key: "naturalExampleAnswers", title: "3 natural example answers" },
  {
    key: "commonVietnameseLearnerMistakes",
    title: "Common Vietnamese learner mistakes",
  },
  { key: "similarChunks", title: "Similar chunks" },
  { key: "miniPracticeTask", title: "One mini practice task" },
] as const;

export const AI_MISSING_CHUNKS_SECTIONS: Array<{
  key: AiTutorStructuredFeedbackSection["key"];
  title: AiTutorStructuredFeedbackSection["title"];
}> = [
  { key: "chunksAlreadyUsed", title: "Chunks already used" },
  { key: "missingUsefulChunks", title: "Missing useful chunks" },
  { key: "improvedAnswer", title: "Improved answer" },
  {
    key: "shortExplanationInVietnamese",
    title: "Short explanation in Vietnamese",
  },
  { key: "miniPracticeTask", title: "Next mini task" },
] as const;

export const AI_SIMULATOR_FEEDBACK_SECTIONS: Array<{
  key: AiTutorStructuredFeedbackSection["key"];
  title: AiTutorStructuredFeedbackSection["title"];
}> = [
  { key: "estimatedBand", title: "Estimated band" },
  { key: "fluencyFeedback", title: "Fluency feedback" },
  { key: "lexicalResourceFeedback", title: "Lexical resource feedback" },
  { key: "grammarFeedback", title: "Grammar feedback" },
  { key: "chunkUsage", title: "Chunk usage" },
  { key: "suggestedChunks", title: "Suggested chunks" },
  {
    key: "nextPracticeRecommendation",
    title: "Next practice recommendation",
  },
] as const;

export const AI_STUDY_COACH_SECTIONS: Array<{
  key: AiTutorStructuredFeedbackSection["key"];
  title: AiTutorStructuredFeedbackSection["title"];
}> = [
  { key: "shortDiagnosis", title: "Short diagnosis" },
  { key: "topThreeWeaknesses", title: "Top 3 weaknesses" },
  { key: "recommendedChunksToReview", title: "5 recommended chunks to review" },
  { key: "speakingPromptsToPractice", title: "3 speaking prompts to practice" },
  { key: "sevenDayMiniStudyPlan", title: "7-day mini study plan" },
] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildStructuredSectionPattern(index: number, title: string) {
  return new RegExp(
    `(?:^|\\n)\\s*(?:[-*#>\\s]*)?(?:\\*\\*)?(?:${index + 1}[\\).\\-\\s]*)?${escapeRegex(title)}(?:\\*\\*)?\\s*:?\\s*`,
    "i",
  );
}

function buildRecommendedChunkSummary(chunks: AiTutorRecommendedChunkContext[]) {
  return chunks.length === 0
    ? "No mapped chunks yet."
    : chunks
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
}

export function supportsPracticeExerciseAiTutor(exerciseType: ExerciseType) {
  return PRACTICE_AI_SUPPORTED_EXERCISE_TYPES.includes(exerciseType);
}

export function supportsPracticeMissingChunks(exerciseType: ExerciseType) {
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
  return [
    "Please coach me for this IELTS Speaking prompt.",
    `Speaking part: ${question.taskType}`,
    `Topic: ${question.topic}`,
    question.subTopic ? `Sub-topic: ${question.subTopic}` : null,
    `Prompt: ${question.prompt}`,
    "Recommended chunks:",
    buildRecommendedChunkSummary(
      question.recommendations.map((recommendation) => ({
        chunk: recommendation.chunk.chunk,
        meaningVi: recommendation.chunk.meaningVi,
        usageRole: recommendation.usageRole,
        exampleSentence: recommendation.exampleSentence,
      })),
    ),
    "Please suggest a natural sample answer, explain how to use the chunks, and keep the feedback concise.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getDefaultSpeakingReviewRequest() {
  return "Please review my IELTS Speaking answer and keep the feedback concise.";
}

export function getDefaultChunkCoachRequest() {
  return "Please explain this chunk for IELTS Speaking use.";
}

export function getDefaultMissingChunksRequest() {
  return "Please suggest realistic IELTS Speaking chunks that could improve this answer.";
}

export function buildSpeakingAnswerReviewSummary(
  context: Pick<
    AiTutorSpeakingAnswerContext,
    "speakingPart" | "topic" | "subTopic" | "prompt" | "recommendedChunks" | "userAnswer"
  >,
) {
  return [
    `Speaking part: ${context.speakingPart}`,
    `Topic: ${context.topic}`,
    context.subTopic ? `Sub-topic: ${context.subTopic}` : null,
    `Prompt: ${context.prompt}`,
    "Recommended chunks:",
    buildRecommendedChunkSummary(context.recommendedChunks),
    `User answer: ${context.userAnswer.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMissingChunksRequestSummary(input: {
  prompt?: string;
  targetChunk?: string;
  recommendedChunks?: AiTutorRecommendedChunkContext[];
  userAnswer: string;
  topic?: string;
  part?: string;
}) {
  return [
    input.part ? `Speaking part: ${input.part}` : null,
    input.topic ? `Topic: ${input.topic}` : null,
    input.prompt ? `Prompt: ${input.prompt}` : null,
    input.targetChunk ? `Target chunk: ${input.targetChunk}` : null,
    "Recommended chunks:",
    buildRecommendedChunkSummary(input.recommendedChunks ?? []),
    `User answer: ${input.userAnswer.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildChunkCoachSummary(
  chunk: Pick<
    ChunkRecord,
    | "chunk"
    | "meaningVi"
    | "example"
    | "difficulty"
    | "bandLevel"
    | "grammarPattern"
    | "tags"
    | "wrongExamples"
    | "topic"
  >,
) {
  return [
    `Chunk: ${chunk.chunk}`,
    `Meaning in Vietnamese: ${chunk.meaningVi}`,
    `Example: ${chunk.example}`,
    chunk.topic?.name ? `Topic: ${chunk.topic.name}` : null,
    `Difficulty: ${chunk.difficulty}`,
    `Band level: ${chunk.bandLevel.toFixed(1)}`,
    chunk.grammarPattern ? `Grammar pattern: ${chunk.grammarPattern}` : null,
    chunk.tags.length > 0 ? `Tags: ${chunk.tags.join(", ")}` : null,
    chunk.wrongExamples.length > 0
      ? `Wrong examples: ${chunk.wrongExamples.join(" | ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseStructuredAiSections(
  answer: string,
  definitions: ReadonlyArray<{
    key: AiTutorStructuredFeedbackSection["key"];
    title: AiTutorStructuredFeedbackSection["title"];
  }>,
) {
  const normalizedAnswer = answer.replace(/\r\n/g, "\n").trim();

  if (!normalizedAnswer) {
    return null;
  }

  const matches = definitions.map((definition, index) => {
    const pattern = buildStructuredSectionPattern(index, definition.title);
    pattern.lastIndex = 0;
    return pattern.exec(normalizedAnswer);
  });

  if (matches.some((match) => !match)) {
    return null;
  }

  const sections = definitions.map((definition, index) => {
    const match = matches[index];

    if (!match) {
      return null;
    }

    const contentStart = match.index + match[0].length;
    const nextMatch = matches[index + 1];
    const contentEnd = nextMatch ? nextMatch.index : normalizedAnswer.length;
    const content = normalizedAnswer.slice(contentStart, contentEnd).trim();

    if (!content) {
      return null;
    }

    return {
      key: definition.key,
      title: definition.title,
      content,
    } satisfies AiTutorStructuredFeedbackSection;
  });

  return sections.every(Boolean)
    ? (sections as AiTutorStructuredFeedbackSection[])
    : null;
}

export function parseStructuredSpeakingFeedback(answer: string) {
  return parseStructuredAiSections(answer, AI_TUTOR_STRUCTURED_FEEDBACK_SECTIONS);
}

export function parseStructuredChunkCoach(answer: string) {
  return parseStructuredAiSections(answer, AI_CHUNK_COACH_SECTIONS);
}

export function parseStructuredMissingChunks(answer: string) {
  return parseStructuredAiSections(answer, AI_MISSING_CHUNKS_SECTIONS);
}

export function parseStructuredSimulatorFeedback(answer: string) {
  return parseStructuredAiSections(answer, AI_SIMULATOR_FEEDBACK_SECTIONS);
}

export function parseStructuredStudyCoach(answer: string) {
  return parseStructuredAiSections(answer, AI_STUDY_COACH_SECTIONS);
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
