import { describe, expect, it } from "vitest";

import {
  buildPracticeSummary,
  evaluateExerciseAnswer,
} from "@/lib/practice";

describe("evaluateExerciseAnswer", () => {
  it("accepts normalized exact answers", () => {
    expect(
      evaluateExerciseAnswer(
        {
          id: "1",
          chunkId: "1",
          type: "VI_TO_CHUNK",
          prompt: "Type the chunk",
          expectedAnswer: "play a key role",
          chunk: "play a key role",
          meaningVi: "dong vai tro quan trong",
          example: "Education plays a key role in development.",
          topic: "Education",
        },
        "Play a key role",
      ),
    ).toBe(true);
  });

  it("requires chunk presence in production answers", () => {
    expect(
      evaluateExerciseAnswer(
        {
          id: "2",
          chunkId: "2",
          type: "CREATE_SENTENCE",
          prompt: "Create a sentence",
          expectedAnswer: "play a key role",
          chunk: "play a key role",
          meaningVi: "dong vai tro quan trong",
          example: "Education plays a key role in development.",
          topic: "Education",
        },
        "Education is very important in society.",
      ),
    ).toBe(false);
  });
});

describe("buildPracticeSummary", () => {
  it("calculates accuracy and average response time", () => {
    const summary = buildPracticeSummary([
      {
        chunkId: "1",
        exerciseType: "VI_TO_CHUNK",
        prompt: "a",
        expectedAnswer: "a",
        userAnswer: "a",
        isCorrect: true,
        responseMs: 4_000,
        confidence: "EASY",
      },
      {
        chunkId: "2",
        exerciseType: "FILL_IN_BLANK",
        prompt: "b",
        expectedAnswer: "b",
        userAnswer: "c",
        isCorrect: false,
        responseMs: 6_000,
        confidence: "HARD",
      },
    ]);

    expect(summary.correctAnswers).toBe(1);
    expect(summary.totalQuestions).toBe(2);
    expect(summary.accuracyRate).toBe(50);
    expect(summary.averageResponseMs).toBe(5_000);
  });
});
