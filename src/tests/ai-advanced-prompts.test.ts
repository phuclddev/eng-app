import { describe, expect, it } from "vitest";

import { buildChunkCoachPrompt } from "@/server/ai/prompts/chunk-coach";
import { buildMissingChunksPrompt } from "@/server/ai/prompts/missing-chunks";
import { buildSampleAnswerPrompt } from "@/server/ai/prompts/sample-answer";
import {
  buildSpeakingSimulatorStartPrompt,
  buildSpeakingSimulatorTurnPrompt,
} from "@/server/ai/prompts/speaking-simulator";
import { buildStudyCoachPrompt } from "@/server/ai/prompts/study-coach";

describe("advanced AI prompt builders", () => {
  it("builds chunk coach prompts with the required structured headings", () => {
    const prompt = buildChunkCoachPrompt({
      id: "chunk-1",
      chunk: "on top of that",
      meaningVi: "hơn nữa",
      example: "On top of that, public transport is affordable.",
      wrongExamples: ["On top of that, I very like it."],
      difficulty: 2,
      bandLevel: 6.5,
      grammarPattern: "Sentence connector",
      tags: ["cohesion", "opinion"],
      notes: null,
      topic: {
        id: "topic-1",
        name: "City life",
        slug: "city-life",
        color: null,
        description: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      review: null,
    });

    expect(prompt).toContain("1. Meaning in Vietnamese");
    expect(prompt).toContain("8. One mini practice task");
    expect(prompt).toContain("Chunk: on top of that");
  });

  it("builds missing chunk prompts with realistic-improvement guidance", () => {
    const prompt = buildMissingChunksPrompt({
      prompt: "Describe a city you enjoy visiting.",
      targetChunk: "on top of that",
      recommendedChunks: [
        {
          chunk: "one of the main reasons",
          meaningVi: "một trong những lý do chính",
        },
      ],
      userAnswer: "I like Da Nang because it is beautiful.",
      topic: "Travel",
      part: "PART_2",
    });

    expect(prompt).toContain("Do not force every recommended chunk");
    expect(prompt).toContain("1. Chunks already used");
    expect(prompt).toContain("5. Next mini task");
  });

  it("builds simulator prompts for both start and final feedback modes", () => {
    const startPrompt = buildSpeakingSimulatorStartPrompt({
      part: "PART_1",
      topic: "Hometown",
      prompt: null,
      targetBand: 6.5,
      numberOfTurns: 5,
    });
    const finalPrompt = buildSpeakingSimulatorTurnPrompt({
      part: "PART_3",
      topic: "Education",
      prompt: "How should schools change in the future?",
      learnerAnswer: "Schools should use more technology.",
      currentTurn: 5,
      numberOfTurns: 5,
      isFinalTurn: true,
    });

    expect(startPrompt).toContain("Start the simulator by asking the first examiner question only.");
    expect(finalPrompt).toContain("1. Estimated band");
    expect(finalPrompt).toContain("7. Next practice recommendation");
  });

  it("builds study coach prompts from a compact learner profile", () => {
    const prompt = buildStudyCoachPrompt({
      dueReviews: 12,
      accuracyRate: 68,
      masteryAverage: 54,
      weakTopics: [
        {
          topic: "Education",
          accuracyRate: 48,
          attempts: 9,
        },
      ],
      lowAccuracyExerciseTypes: [
        {
          type: "CREATE_SENTENCE",
          accuracyRate: 42,
          attempts: 12,
        },
      ],
      weakChunks: [
        {
          chunk: "play a crucial role",
          topic: "Education",
          masteryScore: 30,
          nextReviewAt: new Date().toISOString(),
        },
      ],
      recentPracticeSignals: [
        {
          chunk: "from my perspective",
          topic: "Education",
          exerciseType: "REWRITE_SENTENCE",
          isCorrect: false,
          confidence: "MEDIUM",
        },
      ],
      suggestedPrompts: [
        {
          taskType: "PART_3",
          topic: "Education",
          prompt: "How should schools change in the future?",
        },
      ],
    });

    expect(prompt).toContain("\"dueReviews\": 12");
    expect(prompt).toContain("1. Short diagnosis");
    expect(prompt).toContain("5. 7-day mini study plan");
  });

  it("builds sample answer prompts with prompt context and chunk usage rules", () => {
    const prompt = buildSampleAnswerPrompt({
      taskType: "PART_2",
      topic: "Travel",
      subTopic: "Memorable trip",
      prompt: "Describe a memorable trip you enjoyed.",
      supportingPoints: [
        "where you went",
        "who you went with",
      ],
      targetBand: 6.5,
      recommendedChunks: [
        {
          chunk: "make the most of",
          meaningVi: "tan dung toi da",
          usageRole: "MAIN_IDEA",
          bandLevel: 6.5,
          topic: "Travel",
          example: "I tried to make the most of every single day.",
          source: "RECOMMENDED",
        },
      ],
    });

    expect(prompt).toContain("Prompt: Describe a memorable trip you enjoyed.");
    expect(prompt).toContain("Every used chunk must be wrapped in Markdown bold");
    expect(prompt).toContain("## Sample answer");
    expect(prompt).toContain("make the most of");
    expect(prompt).toContain("180-250 words.");
  });
});
