import type {
  IELTS_SKILLS,
  IELTS_TASK_TYPES,
  QUESTION_CHUNK_USAGE_ROLES,
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
export type QuestionChunkUsageRole = (typeof QUESTION_CHUNK_USAGE_ROLES)[number];
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type PracticeLearningStage =
  | "RECOGNITION"
  | "RECALL"
  | "PRODUCTION";

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
