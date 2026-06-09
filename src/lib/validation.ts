import { z } from "zod";

import {
  AI_TUTOR_PURPOSES,
  AI_SIMULATOR_PARTS,
  CONFIDENCE_LEVELS,
  EXERCISE_TYPES,
  FAMILY_CHILD_FOCUS,
  FAMILY_CHUNK_CHILD_FOCUS,
  FAMILY_CHUNK_STATUSES,
  FAMILY_CONVERSATION_LENGTHS,
  FAMILY_SPEAKER_ROLES,
  FAMILY_TARGET_LEVELS,
  IELTS_SKILLS,
  IELTS_TASK_TYPES,
  PRACTICE_MODES,
  QUESTION_CHUNK_USAGE_ROLES,
  USER_ROLES,
  USER_STATUSES,
} from "@/lib/constants";
import { normalizeList } from "@/lib/utils";

export const topicFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Topic name is required."),
  color: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
});

export const chunkFormSchema = z
  .object({
    id: z.string().optional(),
    chunk: z.string().trim().min(2, "Chunk is required."),
    meaningVi: z.string().trim().min(2, "Vietnamese meaning is required."),
    example: z.string().trim().min(10, "Example sentence is required."),
    wrongExamples: z.string().default(""),
    topicId: z.string().trim().optional().nullable(),
    difficulty: z.coerce.number().int().min(1).max(5),
    bandLevel: z.coerce.number().min(4).max(9),
    grammarPattern: z.string().trim().optional().nullable(),
    tags: z.string().default(""),
    notes: z.string().trim().optional().nullable(),
  })
  .transform((input) => ({
    ...input,
    wrongExamples: normalizeList(input.wrongExamples),
    tags: normalizeList(input.tags),
    topicId: input.topicId ? input.topicId : null,
    grammarPattern: input.grammarPattern ? input.grammarPattern : null,
    notes: input.notes ? input.notes : null,
  }));

export const userModerationSchema = z.object({
  userId: z.string(),
  status: z.enum(USER_STATUSES),
  role: z.enum(USER_ROLES).optional(),
  notes: z.string().trim().optional(),
});

export const familyProfileFormSchema = z.object({
  title: z.string().trim().min(2, "Profile title is required.").max(191),
  profileMarkdown: z
    .string()
    .trim()
    .min(40, "Family profile is too short for AI personalization."),
});

export const familyScenarioFormSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2, "Scenario title is required.").max(191),
  category: z.string().trim().min(2, "Scenario category is required.").max(120),
  childFocus: z.enum(FAMILY_CHILD_FOCUS),
  description: z
    .string()
    .trim()
    .min(12, "Scenario description is too short.")
    .max(4000, "Scenario description is too long."),
  difficulty: z.coerce.number().int().min(1).max(5),
  isActive: z.boolean().optional().default(true),
});

export const familyConversationGenerationSchema = z.object({
  scenarioId: z.string().trim().min(1, "Scenario is required."),
  childFocus: z.enum(FAMILY_CHILD_FOCUS),
  conversationLength: z.enum(FAMILY_CONVERSATION_LENGTHS),
  targetLevel: z.enum(FAMILY_TARGET_LEVELS),
  vietnameseSupport: z.boolean().optional().default(false),
});

export const familyChunkFormSchema = z
  .object({
    id: z.string().trim().optional(),
    text: z.string().trim().min(2, "Chunk text is required.").max(191),
    meaningVi: z
      .string()
      .trim()
      .min(2, "Vietnamese meaning is required.")
      .max(255),
    usageContext: z
      .string()
      .trim()
      .min(5, "Usage context is required.")
      .max(4000, "Usage context is too long."),
    speakerRole: z.enum(FAMILY_SPEAKER_ROLES),
    childFocus: z.enum(FAMILY_CHUNK_CHILD_FOCUS),
    scenarioCategory: z
      .string()
      .trim()
      .min(2, "Scenario category is required.")
      .max(120),
    difficulty: z.coerce.number().int().min(1).max(5),
    frequencyScore: z.coerce.number().int().min(1).max(5),
    personalizationScore: z.coerce.number().int().min(1).max(5),
    exampleSentence: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    sourceConversationId: z.string().trim().optional().nullable(),
    status: z.enum(FAMILY_CHUNK_STATUSES).optional().default("SUGGESTED"),
  })
  .transform((input) => ({
    ...input,
    exampleSentence: input.exampleSentence ? input.exampleSentence : null,
    notes: input.notes ? input.notes : null,
    sourceConversationId: input.sourceConversationId
      ? input.sourceConversationId
      : null,
  }));

export const familyChunkExtractionSchema = z.object({
  conversationId: z.string().trim().min(1, "Conversation is required."),
});

export const familyChunkStatusUpdateSchema = z.object({
  chunkId: z.string().trim().min(1, "Chunk is required."),
  status: z.enum(FAMILY_CHUNK_STATUSES),
});

export const familyChunkBulkStatusUpdateSchema = z.object({
  chunkIds: z
    .array(z.string().trim().min(1, "Chunk is required."))
    .min(1, "Select at least one chunk.")
    .max(100, "Too many chunks selected at once."),
  status: z.enum(FAMILY_CHUNK_STATUSES),
});

export const questionChunkMappingSchema = z.object({
  chunkId: z.string().trim().min(1, "Chunk is required."),
  usageRole: z.enum(QUESTION_CHUNK_USAGE_ROLES),
  exampleSentence: z.string().trim().optional().nullable(),
});

export const questionChunkMappingsFormSchema = z
  .object({
    questionId: z.string().trim().min(1, "Question is required."),
    mappings: z.array(questionChunkMappingSchema).default([]),
  })
  .superRefine((input, context) => {
    const seen = new Set<string>();

    input.mappings.forEach((mapping, index) => {
      const key = `${mapping.chunkId}::${mapping.usageRole}`;

      if (seen.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mappings", index, "chunkId"],
          message: "Duplicate chunk and usage role mapping.",
        });
        return;
      }

      seen.add(key);
    });
  })
  .transform((input) => ({
    questionId: input.questionId,
    mappings: input.mappings.map((mapping, index) => ({
      chunkId: mapping.chunkId,
      usageRole: mapping.usageRole,
      exampleSentence: mapping.exampleSentence
        ? mapping.exampleSentence
        : null,
      sortOrder: index,
    })),
  }));

export const practiceSubmissionSchema = z.object({
  mode: z.enum(PRACTICE_MODES),
  startedAt: z.string().datetime().optional(),
  answers: z
    .array(
      z.object({
        chunkId: z.string(),
        exerciseType: z.enum(EXERCISE_TYPES),
        prompt: z.string(),
        expectedAnswer: z.string(),
        userAnswer: z.string(),
        isCorrect: z.boolean(),
        responseMs: z.number().int().min(0),
        confidence: z.enum(CONFIDENCE_LEVELS),
        feedback: z.string().optional(),
      }),
    )
    .min(1),
});

export const aiTutorChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Message is required.")
    .max(4000, "Message is too long."),
  conversationId: z.string().trim().min(1).optional(),
  purpose: z.enum(AI_TUTOR_PURPOSES).optional().default("GENERAL_CHAT"),
  context: z
    .object({
      kind: z.literal("SPEAKING_ANSWER_REVIEW"),
      speakingPart: z.enum(IELTS_TASK_TYPES),
      topic: z.string().trim().min(2, "Topic is required."),
      subTopic: z.string().trim().optional().nullable(),
      prompt: z.string().trim().min(5, "Prompt is required."),
      recommendedChunks: z
        .array(
          z.object({
            chunk: z.string().trim().min(1, "Chunk is required."),
            meaningVi: z.string().trim().optional().nullable(),
            usageRole: z.enum(QUESTION_CHUNK_USAGE_ROLES).optional().nullable(),
            exampleSentence: z.string().trim().optional().nullable(),
          }),
        )
        .max(12)
        .default([]),
      userAnswer: z
        .string()
        .trim()
        .min(5, "A speaking answer is required.")
        .max(4000, "Speaking answer is too long."),
    })
    .optional(),
});

export const aiChunkCoachSchema = z.object({
  chunkId: z.string().trim().min(1, "Chunk is required."),
});

export const aiMissingChunksSchema = z.object({
  prompt: z.string().trim().optional(),
  targetChunk: z.string().trim().optional(),
  recommendedChunks: z
    .array(
      z.object({
        chunk: z.string().trim().min(1, "Chunk is required."),
        meaningVi: z.string().trim().optional().nullable(),
        usageRole: z.enum(QUESTION_CHUNK_USAGE_ROLES).optional().nullable(),
        exampleSentence: z.string().trim().optional().nullable(),
      }),
    )
    .max(12)
    .default([]),
  userAnswer: z
    .string()
    .trim()
    .min(5, "A speaking answer is required.")
    .max(4000, "Speaking answer is too long."),
  topic: z.string().trim().optional(),
  part: z.enum(AI_SIMULATOR_PARTS).optional(),
});

export const aiSpeakingSimulatorStartSchema = z.object({
  part: z.enum(AI_SIMULATOR_PARTS),
  topic: z.string().trim().max(120).optional(),
  questionId: z.string().trim().optional(),
  prompt: z.string().trim().max(2000).optional(),
  targetBand: z.coerce.number().min(4).max(9).optional(),
  numberOfTurns: z.coerce.number().int().min(3).max(8).default(5),
});

export const aiSpeakingSimulatorMessageSchema = z.object({
  sessionId: z.string().trim().min(1, "Session is required."),
  message: z
    .string()
    .trim()
    .min(2, "Message is required.")
    .max(4000, "Message is too long."),
});

export const aiStudyCoachSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
});

export const aiSampleAnswerSchema = z.object({
  speakingPromptId: z.string().trim().min(1, "Speaking prompt is required."),
  targetBand: z.coerce.number().min(4).max(9).optional(),
  maxChunks: z.coerce.number().int().min(1).max(80).optional().default(30),
});

export const chunkCsvRowSchema = z.object({
  chunk: z.string().trim().min(2),
  meaning: z.string().trim().min(2),
  example: z.string().trim().min(5),
  topic: z.string().trim().optional().default(""),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
  band_level: z.coerce.number().min(4).max(9).default(6),
  grammar_pattern: z.string().trim().optional().default(""),
  tags: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  wrong_examples: z.string().trim().optional().default(""),
});

export const questionCsvRowSchema = z.object({
  skill: z.enum(IELTS_SKILLS).default("SPEAKING"),
  task_type: z.enum(IELTS_TASK_TYPES),
  topic: z.string().trim().min(2),
  sub_topic: z.string().trim().optional().default(""),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
  target_band: z.coerce.number().min(4).max(9).default(6),
  prompt: z.string().trim().min(5),
  supporting_points: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
});

export type TopicFormInput = z.input<typeof topicFormSchema>;
export type TopicFormValues = z.infer<typeof topicFormSchema>;
export type ChunkFormInput = z.input<typeof chunkFormSchema>;
export type ChunkFormValues = z.infer<typeof chunkFormSchema>;
export type FamilyProfileFormInput = z.input<typeof familyProfileFormSchema>;
export type FamilyProfileFormValues = z.infer<typeof familyProfileFormSchema>;
export type FamilyScenarioFormInput = z.input<typeof familyScenarioFormSchema>;
export type FamilyScenarioFormValues = z.infer<typeof familyScenarioFormSchema>;
export type FamilyChunkFormInput = z.input<typeof familyChunkFormSchema>;
export type FamilyChunkFormValues = z.infer<typeof familyChunkFormSchema>;
export type QuestionChunkMappingsFormInput = z.input<
  typeof questionChunkMappingsFormSchema
>;
export type QuestionChunkMappingsFormValues = z.infer<
  typeof questionChunkMappingsFormSchema
>;
export type PracticeSubmission = z.infer<typeof practiceSubmissionSchema>;
export type AiTutorChatPayload = z.infer<typeof aiTutorChatSchema>;
export type AiChunkCoachPayload = z.infer<typeof aiChunkCoachSchema>;
export type AiMissingChunksPayload = z.infer<typeof aiMissingChunksSchema>;
export type AiSpeakingSimulatorStartPayload = z.infer<
  typeof aiSpeakingSimulatorStartSchema
>;
export type AiSpeakingSimulatorMessagePayload = z.infer<
  typeof aiSpeakingSimulatorMessageSchema
>;
export type AiStudyCoachPayload = z.infer<typeof aiStudyCoachSchema>;
export type AiSampleAnswerPayload = z.infer<typeof aiSampleAnswerSchema>;
export type FamilyConversationGenerationPayload = z.infer<
  typeof familyConversationGenerationSchema
>;
export type FamilyChunkExtractionPayload = z.infer<
  typeof familyChunkExtractionSchema
>;
export type FamilyChunkStatusUpdatePayload = z.infer<
  typeof familyChunkStatusUpdateSchema
>;
export type FamilyChunkBulkStatusUpdatePayload = z.infer<
  typeof familyChunkBulkStatusUpdateSchema
>;
