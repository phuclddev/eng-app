export const APP_NAME = "IELTS Chunk Trainer";
export const APP_DESCRIPTION =
  "Contextual active recall platform for IELTS chunk retention, review, and production practice.";

export const USER_ROLES = ["USER", "ADMIN"] as const;
export const USER_STATUSES = ["PENDING", "APPROVED", "BLOCKED"] as const;
export const PRACTICE_MODES = ["LEARN", "REVIEW", "MIXED"] as const;
export const IELTS_SKILLS = ["SPEAKING"] as const;
export const IELTS_TASK_TYPES = ["PART_1", "PART_2", "PART_3"] as const;
export const QUESTION_CHUNK_USAGE_ROLES = [
  "HOOK",
  "MAIN_IDEA",
  "SUPPORTING_DETAIL",
  "EXAMPLE",
  "OPINION",
  "CLOSING",
] as const;
export const AI_TUTOR_PURPOSES = [
  "GENERAL_CHAT",
  "SENTENCE_CORRECTION",
  "SPEAKING_COACH",
  "CHUNK_EXPLANATION",
] as const;
export const EXERCISE_TYPES = [
  "MULTIPLE_CHOICE",
  "FILL_IN_BLANK",
  "VI_TO_CHUNK",
  "REWRITE_SENTENCE",
  "CREATE_SENTENCE",
] as const;
export const CONFIDENCE_LEVELS = ["EASY", "MEDIUM", "HARD"] as const;
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export const EXERCISE_LABELS = {
  MULTIPLE_CHOICE: "Multiple Choice",
  FILL_IN_BLANK: "Fill In Blank",
  VI_TO_CHUNK: "Vietnamese to Chunk",
  REWRITE_SENTENCE: "Rewrite Sentence",
  CREATE_SENTENCE: "Create Sentence",
} as const;

export const STATUS_LABELS = {
  PENDING: "Pending approval",
  APPROVED: "Approved",
  BLOCKED: "Blocked",
} as const;

export const IELTS_SKILL_LABELS = {
  SPEAKING: "Speaking",
} as const;

export const IELTS_TASK_TYPE_LABELS = {
  PART_1: "Speaking Part 1",
  PART_2: "Speaking Part 2",
  PART_3: "Speaking Part 3",
} as const;

export const QUESTION_CHUNK_USAGE_ROLE_LABELS = {
  HOOK: "Hook",
  MAIN_IDEA: "Main Idea",
  SUPPORTING_DETAIL: "Supporting Detail",
  EXAMPLE: "Example",
  OPINION: "Opinion",
  CLOSING: "Closing",
} as const;

export const AI_TUTOR_PURPOSE_LABELS = {
  GENERAL_CHAT: "General Chat",
  SENTENCE_CORRECTION: "Sentence Correction",
  SPEAKING_COACH: "Speaking Coach",
  CHUNK_EXPLANATION: "Chunk Explanation",
} as const;

export const ROLE_LABELS = {
  USER: "Learner",
  ADMIN: "Admin",
} as const;

export const CONFIDENCE_LABELS = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
} as const;

export const SIDEBAR_ITEMS = [
  { href: "/dashboard", label: "Dashboard", adminOnly: false },
  { href: "/learn", label: "Learn Today", adminOnly: false },
  { href: "/questions", label: "Question Bank", adminOnly: false },
  { href: "/ai-tutor", label: "AI Tutor", adminOnly: false },
  { href: "/chunks", label: "Chunk Library", adminOnly: false },
  { href: "/practice", label: "Practice", adminOnly: false },
  { href: "/review", label: "Review", adminOnly: false },
  { href: "/progress", label: "Progress", adminOnly: false },
  { href: "/admin", label: "Admin", adminOnly: true },
] as const;

export const CSV_HEADERS = [
  "chunk",
  "meaning",
  "example",
  "topic",
  "difficulty",
  "band_level",
  "grammar_pattern",
  "tags",
  "notes",
  "wrong_examples",
] as const;

export const QUESTION_CSV_HEADERS = [
  "skill",
  "task_type",
  "topic",
  "sub_topic",
  "difficulty",
  "target_band",
  "prompt",
  "supporting_points",
  "notes",
] as const;

export const DEFAULT_PAGE_SIZE = 10;
