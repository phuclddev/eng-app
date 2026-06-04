import { z } from "zod";

import {
  CONFIDENCE_LEVELS,
  EXERCISE_TYPES,
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
export type QuestionChunkMappingsFormInput = z.input<
  typeof questionChunkMappingsFormSchema
>;
export type QuestionChunkMappingsFormValues = z.infer<
  typeof questionChunkMappingsFormSchema
>;
export type PracticeSubmission = z.infer<typeof practiceSubmissionSchema>;
