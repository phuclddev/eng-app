import type {
  FAMILY_CONVERSATION_RECALL_MODES,
  TRANSLATION_FROM_QUESTION_LENGTHS,
  TRANSLATION_RECALL_ATTEMPT_MODES,
  TRANSLATION_RECALL_CONFIDENCES,
  TRANSLATION_SCRIPT_SOURCE_TYPES,
  IELTS_SKILLS,
  IELTS_TASK_TYPES,
  AI_SIMULATOR_PARTS,
  QUESTION_CHUNK_USAGE_ROLES,
  AI_TUTOR_PURPOSES,
  FAMILY_CHILD_FOCUS,
  FAMILY_CHUNK_CHILD_FOCUS,
  FAMILY_CHUNK_STATUSES,
  FAMILY_CONVERSATION_LENGTHS,
  FAMILY_FAVORITE_TARGET_TYPES,
  FAMILY_PRACTICE_EXERCISE_TYPES,
  FAMILY_PRACTICE_MODES,
  FAMILY_ROLEPLAY_ROLES,
  FAMILY_SCENARIO_SOURCES,
  FAMILY_SCENARIO_STATUSES,
  FAMILY_ROLEPLAY_SENDERS,
  FAMILY_ROLEPLAY_STATUSES,
  FAMILY_SPEAKER_ROLES,
  FAMILY_TARGET_LEVELS,
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
export type FamilyChildFocus = (typeof FAMILY_CHILD_FOCUS)[number];
export type FamilyChunkChildFocus = (typeof FAMILY_CHUNK_CHILD_FOCUS)[number];
export type FamilyChunkStatus = (typeof FAMILY_CHUNK_STATUSES)[number];
export type FamilyConversationLength = (typeof FAMILY_CONVERSATION_LENGTHS)[number];
export type FamilyFavoriteTargetType =
  (typeof FAMILY_FAVORITE_TARGET_TYPES)[number];
export type FamilyPracticeExerciseType =
  (typeof FAMILY_PRACTICE_EXERCISE_TYPES)[number];
export type FamilyPracticeMode = (typeof FAMILY_PRACTICE_MODES)[number];
export type FamilyRoleplayRole = (typeof FAMILY_ROLEPLAY_ROLES)[number];
export type FamilyRoleplaySender = (typeof FAMILY_ROLEPLAY_SENDERS)[number];
export type FamilyRoleplayStatus = (typeof FAMILY_ROLEPLAY_STATUSES)[number];
export type FamilyScenarioStatus =
  (typeof FAMILY_SCENARIO_STATUSES)[number];
export type FamilyScenarioSource =
  (typeof FAMILY_SCENARIO_SOURCES)[number];
export type FamilySpeakerRole = (typeof FAMILY_SPEAKER_ROLES)[number];
export type FamilyTargetLevel = (typeof FAMILY_TARGET_LEVELS)[number];
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

export type IeltsQuestionStatus = "SUGGESTED" | "APPROVED" | "ARCHIVED";
export type IeltsQuestionSource = "MANUAL" | "CSV_IMPORT" | "AI_GENERATED";

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
  status: IeltsQuestionStatus;
  source: IeltsQuestionSource;
  aiReason: string | null;
  popularityScore: number;
  predictedUsefulnessScore: number;
  generatedBatchId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IeltsQuestionGenerationSummary = {
  batchId: string;
  created: number;
  skippedDuplicates: number;
  parseErrors: string[];
  warnings: string[];
  questions: IeltsQuestionRecord[];
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

export type AiSampleAnswerUsedChunk = {
  id: string;
  chunk: string;
  meaningVi: string;
  topic: string | null;
  bandLevel: number;
  usageRole: QuestionChunkUsageRole | null;
};

export type AiSampleAnswerResponse = {
  answer: string;
  speakingPromptId: string;
  selectedChunkCount: number;
  targetBand: number;
  usedChunks: AiSampleAnswerUsedChunk[];
};

export type FamilyProfileRecord = {
  id: string;
  userId: string;
  title: string;
  profileMarkdown: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FamilyScenarioRecord = {
  id: string;
  userId: string;
  title: string;
  category: string;
  childFocus: FamilyChildFocus;
  description: string;
  difficulty: number;
  isActive: boolean;
  status: FamilyScenarioStatus;
  source: FamilyScenarioSource;
  aiReason: string | null;
  suggestedGoals: string[];
  suggestedChunks: string[];
  createdAt: string;
  updatedAt: string;
};

export type FamilyConversationRecord = {
  id: string;
  userId: string;
  scenarioId: string;
  childFocus: FamilyChildFocus;
  title: string;
  conversationMarkdown: string;
  aiConversationId: string | null;
  createdAt: string;
  updatedAt: string;
  scenario: {
    id: string;
    title: string;
    category: string;
  };
};

export type FamilyConversationGenerationResponse = {
  conversation: FamilyConversationRecord;
};

export type FamilyChunkRecord = {
  id: string;
  userId: string;
  text: string;
  meaningVi: string;
  usageContext: string;
  speakerRole: FamilySpeakerRole;
  childFocus: FamilyChunkChildFocus;
  scenarioCategory: string;
  difficulty: number;
  frequencyScore: number;
  personalizationScore: number;
  exampleSentence: string | null;
  notes: string | null;
  sourceConversationId: string | null;
  status: FamilyChunkStatus;
  createdAt: string;
  updatedAt: string;
};

export type FamilyChunkSnapshot = {
  totalApprovedChunks: number;
  totalSuggestedChunks: number;
};

export type FamilyChunkExtractionSummary = {
  created: number;
  skippedDuplicates: number;
  errors: string[];
};

export type FamilyChunkExtractionResponse = {
  summary: FamilyChunkExtractionSummary;
};

export type FamilyReviewSnapshot = {
  nextReviewAt: string;
  intervalDays: number;
  masteryScore: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  lastCorrect: boolean | null;
};

export type FamilyPracticeExercise = {
  id: string;
  familyChunkId: string;
  type: FamilyPracticeExerciseType;
  prompt: string;
  expectedAnswer: string;
  options?: string[];
  hint?: string;
  chunk: string;
  meaningVi: string;
  usageContext: string;
  exampleSentence: string | null;
  speakerRole: FamilySpeakerRole;
  childFocus: FamilyChunkChildFocus;
  scenarioCategory: string;
};

export type FamilyPracticeDeck = {
  mode: FamilyPracticeMode;
  exercises: FamilyPracticeExercise[];
  totalDue: number;
  totalApprovedChunks: number;
};

export type FamilyPracticeAnswerPayload = {
  familyChunkId: string;
  exerciseType: FamilyPracticeExerciseType;
  prompt: string;
  expectedAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  responseTimeMs: number;
  confidenceLevel: ConfidenceLevel;
  feedback?: string;
};

export type FamilyPracticeSummary = {
  totalQuestions: number;
  correctAnswers: number;
  averageResponseMs: number;
  accuracyRate: number;
  score: number;
};

export type FamilyDashboardSnapshot = {
  totalApprovedChunks: number;
  chunksLearned: number;
  dueReviews: number;
  weeklyAccuracy: number;
  familyStreakDays: number;
  totalSessions: number;
  topScenarios: Array<{
    scenarioCategory: string;
    attempts: number;
    accuracyRate: number;
  }>;
  topSpeakerRoles: Array<{
    speakerRole: FamilySpeakerRole;
    attempts: number;
    accuracyRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    label: string;
    detail: string;
    createdAt: string;
  }>;
};

export type FamilyPracticeAiFeedbackResponse = {
  answer: string;
  available: boolean;
};

export type FamilyRoleplayMessageRecord = {
  id: string;
  sender: FamilyRoleplaySender;
  roleLabel: string;
  content: string;
  turnNumber: number;
  createdAt: string;
};

export type FamilyRoleplayScenarioSnapshot = {
  id: string;
  title: string;
  category: string;
  description: string;
  childFocus: FamilyChildFocus;
};

export type FamilyRoleplaySessionRecord = {
  id: string;
  userId: string;
  scenarioId: string | null;
  userRole: FamilyRoleplayRole;
  aiRole: FamilyRoleplayRole;
  childFocus: FamilyChildFocus;
  targetLevel: FamilyTargetLevel;
  title: string;
  status: FamilyRoleplayStatus;
  turnsLimit: number;
  turnsTaken: number;
  finalFeedbackMarkdown: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scenario: FamilyRoleplayScenarioSnapshot | null;
  messages: FamilyRoleplayMessageRecord[];
};

export type FamilyRoleplaySessionSummary = {
  id: string;
  title: string;
  userRole: FamilyRoleplayRole;
  aiRole: FamilyRoleplayRole;
  childFocus: FamilyChildFocus;
  targetLevel: FamilyTargetLevel;
  status: FamilyRoleplayStatus;
  turnsLimit: number;
  turnsTaken: number;
  scenarioTitle: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type FamilyRecommendedChunk = {
  id: string;
  text: string;
  meaningVi: string;
  exampleSentence: string | null;
  childFocus: FamilyChunkChildFocus;
  speakerRole: FamilySpeakerRole;
  scenarioCategory: string;
  personalizationScore: number;
  frequencyScore: number;
  masteryScore: number | null;
  nextReviewAt: string | null;
  reason: "DUE" | "WEAK" | "FRESH" | "PERSONALIZED";
};

export type FamilyRecommendedScenario = {
  id: string;
  title: string;
  category: string;
  childFocus: FamilyChildFocus;
  description: string;
  difficulty: number;
  reason: "FRESH" | "FREQUENT" | "CHILD_FOCUS" | "WEAK_AREA";
};

export type FamilyRecommendedConversation = {
  id: string;
  title: string;
  scenarioTitle: string;
  childFocus: FamilyChildFocus;
  updatedAt: string;
};

export type FamilyRecommendedRoleplay = {
  userRole: FamilyRoleplayRole;
  aiRole: FamilyRoleplayRole;
  childFocus: FamilyChildFocus;
  reason: string;
  scenarioId: string | null;
  scenarioTitle: string | null;
};

export type FamilyTodayRecommendations = {
  childFocus: FamilyChildFocus;
  generatedAt: string;
  dueReviewCount: number;
  weakChunkCount: number;
  approvedChunkCount: number;
  recommendedChunks: FamilyRecommendedChunk[];
  recommendedScenario: FamilyRecommendedScenario | null;
  recommendedConversation: FamilyRecommendedConversation | null;
  recommendedRoleplay: FamilyRecommendedRoleplay | null;
};

export type FamilyDailyPlanRecord = {
  id: string;
  childFocus: FamilyChildFocus;
  answer: string;
  generatedAt: string;
  expiresAt: string | null;
  cached: boolean;
};

export type FamilyFavoriteRecord = {
  id: string;
  userId: string;
  targetType: FamilyFavoriteTargetType;
  targetId: string;
  note: string | null;
  createdAt: string;
  label: string | null;
  detail: string | null;
};

export type FamilyInsightsSnapshot = {
  windowDays: number;
  totalAnswers: number;
  totalCorrect: number;
  accuracyRate: number;
  weeklyStreakDays: number;
  conversationsGenerated: number;
  roleplaysStarted: number;
  topPracticedChunks: Array<{
    chunkId: string;
    text: string;
    meaningVi: string;
    attempts: number;
    accuracyRate: number;
  }>;
  weakChunks: Array<{
    chunkId: string;
    text: string;
    meaningVi: string;
    masteryScore: number;
  }>;
  strongestChunks: Array<{
    chunkId: string;
    text: string;
    meaningVi: string;
    masteryScore: number;
  }>;
  topScenarios: Array<{
    scenarioCategory: string;
    attempts: number;
    accuracyRate: number;
  }>;
};

export type FamilyInsightsSummaryResponse = {
  answer: string;
  cached: boolean;
};

export type TranslationRecallConfidence =
  (typeof TRANSLATION_RECALL_CONFIDENCES)[number];
export type TranslationRecallAttemptMode =
  (typeof TRANSLATION_RECALL_ATTEMPT_MODES)[number];
export type TranslationScriptSourceType =
  (typeof TRANSLATION_SCRIPT_SOURCE_TYPES)[number];
export type TranslationFromQuestionLength =
  (typeof TRANSLATION_FROM_QUESTION_LENGTHS)[number];

export type TranslationScriptSummary = {
  id: string;
  title: string;
  topic: string;
  bandLevel: number;
  sentenceCount: number;
  reviewedCount: number;
  updatedAt: string;
  sourceType: TranslationScriptSourceType;
  sourceQuestionId: string | null;
  version: number;
  generatedByAi: boolean;
};

export type TranslationSentenceRecord = {
  id: string;
  orderIndex: number;
  englishText: string;
  vietnameseText: string;
  notes: string | null;
  review: {
    reviewCount: number;
    lastConfidence: TranslationRecallConfidence | null;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    lastReviewedAt: string | null;
  } | null;
  savedChunks: Array<{
    id: string;
    englishPhrase: string;
    chunkId: string | null;
  }>;
};

export type TranslationScriptRecord = {
  id: string;
  title: string;
  topic: string;
  bandLevel: number;
  notes: string | null;
  updatedAt: string;
  sentences: TranslationSentenceRecord[];
  sourceType: TranslationScriptSourceType;
  sourceQuestionId: string | null;
  version: number;
  generatedByAi: boolean;
  usedChunkIds: string[];
  usedChunks: TranslationRecallUsedChunkRecord[];
};

export type TranslationAiChunkExtractResponse = {
  chunk: string;
  meaningVi: string;
  usage: string;
  example: string;
  suggestedTopic: string | null;
  bandEstimate: number;
};

export type TranslationChunkMappingRecord = {
  id: string;
  sentenceId: string;
  englishPhrase: string;
  meaningVi: string;
  chunkId: string | null;
  suggestedTopic: string | null;
  bandEstimate: number | null;
};

export type TranslationImportSummary = {
  scriptsCreated: number;
  scriptsUpdated: number;
  sentencesCreated: number;
  totalRows: number;
  errors: Array<{ rowNumber?: number; message: string }>;
};

export type TranslationRecallUsedChunkRecord = {
  id: string;
  chunk: string;
  meaningVi: string;
  topic: string | null;
  bandLevel: number;
};

export type TranslationRecallFromQuestionResponse = {
  script: {
    id: string;
    title: string;
    topic: string;
    bandLevel: number;
    version: number;
    sentenceCount: number;
    sourceQuestionId: string;
  };
  usedChunks: TranslationRecallUsedChunkRecord[];
  englishMarkdown: string;
  vietnameseText: string;
  duplicate: boolean;
  fallbackUsed: boolean;
  warnings: string[];
};

export type TranslationRecallQuestionStat = {
  questionId: string;
  scriptCount: number;
  latestScriptId: string | null;
};

export type FamilyScenarioGenerateSummary = {
  created: number;
  skippedDuplicates: number;
  scenarios: FamilyScenarioRecord[];
  warnings: string[];
};

export type TranslationRecallMissingChunk = {
  chunk: string;
  meaningVi: string | null;
};

export type TranslationRecallAttemptRecord = {
  id: string;
  scriptId: string;
  sentenceId: string | null;
  mode: TranslationRecallAttemptMode;
  userAnswer: string;
  score: number | null;
  feedbackMarkdown: string;
  createdAt: string;
};

export type TranslationRecallCompareResponse = {
  attempt: TranslationRecallAttemptRecord;
  originalEnglish: string;
  missingChunks: TranslationRecallMissingChunk[];
};

export type FamilyConversationRecallMode =
  (typeof FAMILY_CONVERSATION_RECALL_MODES)[number];

export type FamilyConversationRecallLineRecord = {
  id: string;
  conversationId: string;
  orderIndex: number;
  speaker: string;
  englishText: string;
  vietnameseText: string;
  usedChunks: string[];
  latestAttempt: FamilyConversationRecallAttemptRecord | null;
  attemptCount: number;
};

export type FamilyConversationRecallAttemptRecord = {
  id: string;
  conversationId: string;
  lineId: string | null;
  mode: FamilyConversationRecallMode;
  userAnswer: string;
  score: number | null;
  feedbackMarkdown: string;
  createdAt: string;
};

export type FamilyConversationRecallScript = {
  conversationId: string;
  title: string;
  scenarioTitle: string;
  childFocus: FamilyChildFocus;
  hasRecall: boolean;
  lines: FamilyConversationRecallLineRecord[];
};

export type FamilyConversationRecallMissingChunk = {
  chunk: string;
  meaningVi: string | null;
};

export type FamilyConversationRecallCompareResponse = {
  attempt: FamilyConversationRecallAttemptRecord;
  originalEnglish: string;
  missingChunks: FamilyConversationRecallMissingChunk[];
};

export type FamilyConversationRecallCreateResponse = {
  created: number;
  conversationId: string;
  recallUrl: string;
};
