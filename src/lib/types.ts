import type {
  IELTS_SKILLS,
  IELTS_TASK_TYPES,
  AI_SIMULATOR_PARTS,
  QUESTION_CHUNK_USAGE_ROLES,
  AI_TUTOR_PURPOSES,
  CONFIDENCE_LEVELS,
  EXERCISE_TYPES,
  PRACTICE_MODES,
  USER_ROLES,
  USER_STATUSES,
} from "@/lib/constants";

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];
export type PracticeMode = (typeof PRACTICE_MODES)[number];
export type IeltsSkill = (typeof IELTS_SKILLS)[number];
export type IeltsTaskType = (typeof IELTS_TASK_TYPES)[number];
export type AiSimulatorPart = (typeof AI_SIMULATOR_PARTS)[number];
export type QuestionChunkUsageRole = (typeof QUESTION_CHUNK_USAGE_ROLES)[number];
export type AiTutorPurpose = (typeof AI_TUTOR_PURPOSES)[number];
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type PracticeLearningStage =
  | "RECOGNITION"
  | "RECALL"
  | "PRODUCTION";
export type AiTutorStructuredFeedbackKey =
  | "overallFeedback"
  | "grammarFixes"
  | "naturalness"
  | "chunkUsage"
  | "betterVersion"
  | "suggestedChunks"
  | "nextPracticeTask"
  | "meaningInVietnamese"
  | "whenToUse"
  | "whenNotToUse"
  | "ieltsSpeakingContext"
  | "naturalExampleAnswers"
  | "commonVietnameseLearnerMistakes"
  | "similarChunks"
  | "miniPracticeTask"
  | "chunksAlreadyUsed"
  | "missingUsefulChunks"
  | "improvedAnswer"
  | "shortExplanationInVietnamese"
  | "estimatedBand"
  | "fluencyFeedback"
  | "lexicalResourceFeedback"
  | "grammarFeedback"
  | "nextPracticeRecommendation"
  | "shortDiagnosis"
  | "topThreeWeaknesses"
  | "recommendedChunksToReview"
  | "speakingPromptsToPractice"
  | "sevenDayMiniStudyPlan";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
  status: UserStatus;
};

export type TopicOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  description: string | null;
  chunkCount?: number;
};

export type ChunkOption = {
  id: string;
  chunk: string;
  meaningVi: string;
  topic: string | null;
};

export type ReviewSnapshot = {
  nextReviewAt: string;
  intervalDays: number;
  masteryScore: number;
  reviewCount: number;
};

export type ChunkRecord = {
  id: string;
  chunk: string;
  meaningVi: string;
  example: string;
  wrongExamples: string[];
  difficulty: number;
  bandLevel: number;
  grammarPattern: string | null;
  tags: string[];
  notes: string | null;
  topic: TopicOption | null;
  createdAt: string;
  updatedAt: string;
  review: ReviewSnapshot | null;
};

export type PracticeExercise = {
  id: string;
  chunkId: string;
  type: ExerciseType;
  learningStage: PracticeLearningStage;
  prompt: string;
  expectedAnswer: string;
  options?: string[];
  hint?: string;
  chunk: string;
  meaningVi: string;
  example: string;
  topic: string | null;
};

export type PracticeAnswerPayload = {
  chunkId: string;
  exerciseType: ExerciseType;
  prompt: string;
  expectedAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  responseMs: number;
  confidence: ConfidenceLevel;
  feedback?: string;
};

export type PracticeDeck = {
  mode: PracticeMode;
  exercises: PracticeExercise[];
  totalDue: number;
  totalChunks: number;
};

export type QuestionChunkRecommendation = {
  id: string;
  usageRole: QuestionChunkUsageRole;
  exampleSentence: string | null;
  sortOrder: number;
  chunk: ChunkOption & {
    example: string;
  };
};

export type IeltsQuestionRecord = {
  id: string;
  skill: IeltsSkill;
  taskType: IeltsTaskType;
  topic: string;
  subTopic: string | null;
  prompt: string;
  supportingPoints: string[];
  difficulty: number;
  targetBand: number;
  notes: string | null;
  mappingCount: number;
  recommendations: QuestionChunkRecommendation[];
  createdAt: string;
  updatedAt: string;
};

export type IeltsQuestionPromptOption = {
  id: string;
  taskType: IeltsTaskType;
  topic: string;
  subTopic: string | null;
  prompt: string;
  targetBand: number;
};

export type DashboardSnapshot = {
  totalChunks: number;
  dueReviews: number;
  accuracyRate: number;
  currentStreak: number;
  masteryAverage: number;
  learnedThisWeek: number;
  weakTopics: Array<{
    topic: string;
    accuracyRate: number;
    attempts: number;
  }>;
  recentActivity: Array<{
    id: string;
    label: string;
    detail: string;
    createdAt: string;
  }>;
};

export type ProgressSnapshot = {
  byExerciseType: Array<{
    type: ExerciseType;
    attempts: number;
    accuracyRate: number;
  }>;
  byTopic: Array<{
    topic: string;
    attempts: number;
    accuracyRate: number;
  }>;
  weakChunks: Array<{
    chunk: string;
    topic: string | null;
    masteryScore: number;
    nextReviewAt: string;
  }>;
};

export type AiTutorRecommendedChunkContext = {
  chunk: string;
  meaningVi?: string | null;
  usageRole?: QuestionChunkUsageRole | null;
  exampleSentence?: string | null;
};

export type AiTutorSpeakingAnswerContext = {
  kind: "SPEAKING_ANSWER_REVIEW";
  speakingPart: AiSimulatorPart;
  topic: string;
  subTopic?: string | null;
  prompt: string;
  recommendedChunks: AiTutorRecommendedChunkContext[];
  userAnswer: string;
};

export type AiTutorStructuredFeedbackSection = {
  key: AiTutorStructuredFeedbackKey;
  title: string;
  content: string;
};

export type AiSimulatorMessageRecord = {
  id: string;
  role: "EXAMINER" | "LEARNER" | "FEEDBACK";
  content: string;
  turnNumber: number;
  createdAt: string;
};

export type AiSimulatorSessionRecord = {
  id: string;
  part: AiSimulatorPart;
  topic: string | null;
  prompt: string | null;
  targetBand: number | null;
  numberOfTurns: number;
  currentTurn: number;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  finalFeedback: string | null;
  finalFeedbackSections: AiTutorStructuredFeedbackSection[] | null;
  messages: AiSimulatorMessageRecord[];
  createdAt: string;
  updatedAt: string;
};

export type AiStudyCoachSnapshotRecord = {
  id: string;
  answer: string;
  sections: AiTutorStructuredFeedbackSection[] | null;
  generatedAt: string;
  expiresAt: string | null;
};
