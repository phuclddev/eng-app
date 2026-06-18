export const APP_NAME = "IELTS Chunk Trainer";
export const APP_DESCRIPTION =
  "Contextual active recall platform for IELTS chunk retention, review, and production practice.";

export const USER_ROLES = ["USER", "ADMIN"] as const;
export const USER_STATUSES = ["PENDING", "APPROVED", "BLOCKED"] as const;
export const PRACTICE_MODES = ["LEARN", "REVIEW", "MIXED"] as const;
export const IELTS_SKILLS = ["SPEAKING"] as const;
export const IELTS_TASK_TYPES = ["PART_1", "PART_2", "PART_3"] as const;
export const SPEAKING_IDEA_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
] as const;
export const SPEAKING_IDEA_SUPPORT_TYPES = [
  "REASON",
  "EXAMPLE",
  "RESULT",
  "CONTRAST",
  "DETAIL",
  "PERSONAL_EXPERIENCE",
] as const;
export const SPEAKING_IDEA_GENERATE_DEFAULT_COUNT = 10;
export const SPEAKING_IDEA_GENERATE_MAX_COUNT = 30;
export const AI_SIMULATOR_PARTS = [
  "PART_1",
  "PART_2",
  "PART_3",
  "MIXED",
] as const;
export const QUESTION_CHUNK_USAGE_ROLES = [
  "HOOK",
  "MAIN_IDEA",
  "SUPPORTING_DETAIL",
  "EXAMPLE",
  "OPINION",
  "CLOSING",
  "OPENING",
  "REASON",
  "CONTRAST",
  "DETAIL",
  "EMOTION",
  "STORYTELLING",
  "SPECULATION",
  "COMPARISON",
  "ENDING",
  "FILLER",
] as const;
export const IELTS_QUESTION_STATUSES = [
  "SUGGESTED",
  "APPROVED",
  "ARCHIVED",
] as const;
export const IELTS_QUESTION_SOURCES = [
  "MANUAL",
  "CSV_IMPORT",
  "AI_GENERATED",
] as const;
export const IELTS_QUESTION_GENERATE_MAX_COUNT = 60;
export const IELTS_QUESTION_GENERATE_DEFAULT_COUNT = 20;
export const AI_TUTOR_PURPOSES = [
  "GENERAL_CHAT",
  "SENTENCE_CORRECTION",
  "SPEAKING_COACH",
  "CHUNK_EXPLANATION",
] as const;
export const FAMILY_CHILD_FOCUS = ["KIWI", "VIVI", "BOTH"] as const;
export const FAMILY_CHUNK_CHILD_FOCUS = [
  "KIWI",
  "VIVI",
  "BOTH",
  "GENERAL",
] as const;
export const FAMILY_CONVERSATION_LENGTHS = [
  "SHORT",
  "MEDIUM",
  "LONG",
] as const;
export const FAMILY_TARGET_LEVELS = [
  "BASIC",
  "NATURAL",
  "ADVANCED",
] as const;
export const FAMILY_SPEAKER_ROLES = [
  "FATHER",
  "CHILD",
  "MOTHER",
  "GRANDPARENT",
  "GENERAL",
] as const;
export const FAMILY_CHUNK_STATUSES = [
  "SUGGESTED",
  "APPROVED",
  "ARCHIVED",
] as const;
export const FAMILY_SCENARIO_STATUSES = [
  "SUGGESTED",
  "APPROVED",
  "ARCHIVED",
] as const;
export const FAMILY_SCENARIO_SOURCES = ["MANUAL", "AI"] as const;
export const FAMILY_SCENARIO_GENERATE_MAX_COUNT = 30;
export const FAMILY_SCENARIO_GENERATE_DEFAULT_COUNT = 10;
export const FAMILY_PRACTICE_MODES = ["DAILY", "REVIEW", "MIXED"] as const;
export const FAMILY_PRACTICE_EXERCISE_TYPES = [
  "VI_TO_CHUNK",
  "FILL_IN_DIALOG",
  "NATURAL_RESPONSE",
  "CONTINUE_CONVERSATION",
  "FAMILY_CHUNK_RECALL",
] as const;
export const FAMILY_REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;
export const FAMILY_PRACTICE_DEFAULT_DECK_SIZE = 8;
export const FAMILY_PRACTICE_MAX_DECK_SIZE = 20;

export const FAMILY_ROLEPLAY_ROLES = [
  "FATHER",
  "MOTHER",
  "KIWI",
  "VIVI",
  "GRANDPARENT",
] as const;
export const FAMILY_ROLEPLAY_STATUSES = [
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
] as const;
export const FAMILY_ROLEPLAY_SENDERS = ["USER", "AI"] as const;
export const FAMILY_ROLEPLAY_MIN_TURNS = 3;
export const FAMILY_ROLEPLAY_MAX_TURNS = 12;
export const FAMILY_ROLEPLAY_DEFAULT_TURNS = 8;

export const FAMILY_FAVORITE_TARGET_TYPES = [
  "CONVERSATION",
  "CHUNK",
  "ROLEPLAY",
  "SCENARIO",
] as const;
export const FAMILY_DAILY_PLAN_TTL_MS = 12 * 60 * 60 * 1000;
export const FAMILY_INSIGHTS_WINDOW_DAYS = 7;

export const TRANSLATION_RECALL_CONFIDENCES = [
  "EASY",
  "MEDIUM",
  "HARD",
] as const;
export const TRANSLATION_RECALL_ATTEMPT_MODES = [
  "SENTENCE",
  "PASSAGE",
] as const;
export const FAMILY_CONVERSATION_RECALL_MODES = ["LINE", "FULL"] as const;
export const TRANSLATION_CSV_HEADERS = [
  "title",
  "topic",
  "bandLevel",
  "englishText",
  "vietnameseText",
] as const;
export const TRANSLATION_SCRIPT_SOURCE_TYPES = [
  "MANUAL",
  "SPEAKING_QUESTION",
] as const;
export const TRANSLATION_FROM_QUESTION_LENGTHS = [
  "SHORT",
  "MEDIUM",
  "LONG",
] as const;
export const TRANSLATION_FROM_QUESTION_MAX_CHUNKS = 30;
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

export const SPEAKING_IDEA_STATUS_LABELS = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
} as const;

export const SPEAKING_IDEA_SUPPORT_TYPE_LABELS = {
  REASON: "Reason",
  EXAMPLE: "Example",
  RESULT: "Result",
  CONTRAST: "Contrast",
  DETAIL: "Detail",
  PERSONAL_EXPERIENCE: "Personal Experience",
} as const;

export const AI_SIMULATOR_PART_LABELS = {
  PART_1: "Speaking Part 1",
  PART_2: "Speaking Part 2",
  PART_3: "Speaking Part 3",
  MIXED: "Mixed Speaking",
} as const;

export const QUESTION_CHUNK_USAGE_ROLE_LABELS = {
  HOOK: "Hook",
  MAIN_IDEA: "Main Idea",
  SUPPORTING_DETAIL: "Supporting Detail",
  EXAMPLE: "Example",
  OPINION: "Opinion",
  CLOSING: "Closing",
  OPENING: "Opening",
  REASON: "Reason",
  CONTRAST: "Contrast",
  DETAIL: "Detail",
  EMOTION: "Emotion",
  STORYTELLING: "Storytelling",
  SPECULATION: "Speculation",
  COMPARISON: "Comparison",
  ENDING: "Ending",
  FILLER: "Filler",
} as const;

export const IELTS_QUESTION_STATUS_LABELS = {
  SUGGESTED: "Suggested",
  APPROVED: "Approved",
  ARCHIVED: "Archived",
} as const;

export const IELTS_QUESTION_SOURCE_LABELS = {
  MANUAL: "Manual",
  CSV_IMPORT: "CSV import",
  AI_GENERATED: "AI",
} as const;

export const AI_TUTOR_PURPOSE_LABELS = {
  GENERAL_CHAT: "General Chat",
  SENTENCE_CORRECTION: "Sentence Correction",
  SPEAKING_COACH: "Speaking Coach",
  CHUNK_EXPLANATION: "Chunk Explanation",
} as const;

export const FAMILY_CHILD_FOCUS_LABELS = {
  KIWI: "Kiwi",
  VIVI: "Vivi",
  BOTH: "Both",
} as const;

export const FAMILY_CHUNK_CHILD_FOCUS_LABELS = {
  KIWI: "Kiwi",
  VIVI: "Vivi",
  BOTH: "Both",
  GENERAL: "General",
} as const;

export const FAMILY_CONVERSATION_LENGTH_LABELS = {
  SHORT: "Short",
  MEDIUM: "Medium",
  LONG: "Long",
} as const;

export const FAMILY_TARGET_LEVEL_LABELS = {
  BASIC: "Basic",
  NATURAL: "Natural",
  ADVANCED: "Advanced",
} as const;

export const FAMILY_SPEAKER_ROLE_LABELS = {
  FATHER: "Father",
  CHILD: "Child",
  MOTHER: "Mother",
  GRANDPARENT: "Grandparent",
  GENERAL: "General",
} as const;

export const FAMILY_CHUNK_STATUS_LABELS = {
  SUGGESTED: "Suggested",
  APPROVED: "Approved",
  ARCHIVED: "Archived",
} as const;

export const FAMILY_SCENARIO_STATUS_LABELS = {
  SUGGESTED: "Suggested",
  APPROVED: "Approved",
  ARCHIVED: "Archived",
} as const;

export const FAMILY_SCENARIO_SOURCE_LABELS = {
  MANUAL: "Manual",
  AI: "AI",
} as const;

export const FAMILY_PRACTICE_MODE_LABELS = {
  DAILY: "Today's Practice",
  REVIEW: "Today's Review",
  MIXED: "Mixed Practice",
} as const;

export const FAMILY_PRACTICE_EXERCISE_LABELS = {
  VI_TO_CHUNK: "Vietnamese to chunk",
  FILL_IN_DIALOG: "Fill in the dialog",
  NATURAL_RESPONSE: "Choose the natural response",
  CONTINUE_CONVERSATION: "Continue the conversation",
  FAMILY_CHUNK_RECALL: "Family chunk recall",
} as const;

export const FAMILY_ROLEPLAY_ROLE_LABELS = {
  FATHER: "Father (Phuc)",
  MOTHER: "Mother",
  KIWI: "Kiwi",
  VIVI: "Vivi",
  GRANDPARENT: "Grandparent",
} as const;

export const FAMILY_ROLEPLAY_STATUS_LABELS = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
} as const;

export const FAMILY_FAVORITE_TARGET_LABELS = {
  CONVERSATION: "Conversation",
  CHUNK: "Family chunk",
  ROLEPLAY: "Roleplay session",
  SCENARIO: "Scenario",
} as const;

export const TRANSLATION_RECALL_CONFIDENCE_LABELS = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
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

export const IELTS_SIDEBAR_ITEMS = [
  { href: "/dashboard", label: "Dashboard", adminOnly: false },
  { href: "/learn", label: "Learn Today", adminOnly: false },
  { href: "/questions", label: "Question Bank", adminOnly: false },
  { href: "/ai-tutor", label: "AI Tutor", adminOnly: false },
  { href: "/speaking-simulator", label: "Speaking Simulator", adminOnly: false },
  { href: "/study-coach", label: "Study Coach", adminOnly: false },
  { href: "/chunks", label: "Chunk Library", adminOnly: false },
  { href: "/practice", label: "Practice", adminOnly: false },
  { href: "/review", label: "Review", adminOnly: false },
  { href: "/translation", label: "Translation Recall", adminOnly: false },
  { href: "/progress", label: "Progress", adminOnly: false },
] as const;

export const FAMILY_SIDEBAR_ITEMS = [
  { href: "/family/today", label: "Today's Plan", adminOnly: false },
  { href: "/family", label: "Family Home", adminOnly: false },
  { href: "/family/profile", label: "Family Profile", adminOnly: false },
  { href: "/family/scenarios", label: "Scenarios", adminOnly: false },
  { href: "/family/conversations", label: "Conversations", adminOnly: false },
  { href: "/family/chunks", label: "Family Chunks", adminOnly: false },
  { href: "/family/practice", label: "Family Practice", adminOnly: false },
  { href: "/family/roleplay", label: "Family Roleplay", adminOnly: false },
  { href: "/family/insights", label: "Weekly Insights", adminOnly: false },
  { href: "/family/favorites", label: "Favorites", adminOnly: false },
] as const;

export const ADMIN_SIDEBAR_ITEMS = [
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/admin/ideas", label: "Speaking Idea Map", adminOnly: true },
  { href: "/admin/ideas/coverage", label: "Idea Coverage", adminOnly: true },
] as const;

export const SIDEBAR_ITEMS = [
  ...IELTS_SIDEBAR_ITEMS,
  ...FAMILY_SIDEBAR_ITEMS,
  ...ADMIN_SIDEBAR_ITEMS,
] as const;

export const SIDEBAR_GROUPS = [
  {
    key: "ielts",
    label: "IELTS Workspace",
    items: IELTS_SIDEBAR_ITEMS,
  },
  {
    key: "family",
    label: "Family English",
    items: FAMILY_SIDEBAR_ITEMS,
  },
  {
    key: "admin",
    label: "Admin",
    items: ADMIN_SIDEBAR_ITEMS,
  },
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
