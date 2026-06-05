import { buildAiTutorBaseInstructions, joinPromptLines } from "@/server/ai/prompts/base";

export type StudyCoachProfile = {
  dueReviews: number;
  accuracyRate: number;
  masteryAverage: number;
  weakTopics: Array<{
    topic: string;
    accuracyRate: number;
    attempts: number;
  }>;
  lowAccuracyExerciseTypes: Array<{
    type: string;
    accuracyRate: number;
    attempts: number;
  }>;
  weakChunks: Array<{
    chunk: string;
    topic: string | null;
    masteryScore: number;
    nextReviewAt: string;
  }>;
  recentPracticeSignals: Array<{
    chunk: string;
    topic: string | null;
    exerciseType: string;
    isCorrect: boolean;
    confidence: string;
  }>;
  suggestedPrompts: Array<{
    taskType: string;
    topic: string;
    prompt: string;
  }>;
};

export function buildStudyCoachPrompt(profile: StudyCoachProfile) {
  return joinPromptLines([
    ...buildAiTutorBaseInstructions(),
    "Role: AI study coach for IELTS Speaking chunk learning.",
    "Use the learner profile below to produce a short, practical study plan.",
    "Do not mention private system details or raw analytics jargon.",
    "",
    "Learner profile:",
    JSON.stringify(profile, null, 2),
    "",
    "Return the response using exactly these section headings in order:",
    "1. Short diagnosis",
    "2. Top 3 weaknesses",
    "3. 5 recommended chunks to review",
    "4. 3 speaking prompts to practice",
    "5. 7-day mini study plan",
    "Keep each section concise and actionable.",
  ]);
}
