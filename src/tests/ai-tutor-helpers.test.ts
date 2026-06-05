import { describe, expect, it } from "vitest";

import {
  buildPracticeAiTutorMessage,
  supportsPracticeExerciseAiTutor,
} from "@/lib/ai-tutor";

describe("AI tutor learner helpers", () => {
  it("marks only production-style practice exercises as AI-eligible", () => {
    expect(supportsPracticeExerciseAiTutor("REWRITE_SENTENCE")).toBe(true);
    expect(supportsPracticeExerciseAiTutor("CREATE_SENTENCE")).toBe(true);
    expect(supportsPracticeExerciseAiTutor("MULTIPLE_CHOICE")).toBe(false);
  });

  it("builds contextual practice correction requests", () => {
    const message = buildPracticeAiTutorMessage(
      {
        type: "CREATE_SENTENCE",
        prompt: 'Create an IELTS-style sentence using "on top of that".',
        chunk: "on top of that",
        meaningVi: "hơn nữa",
        example: "On top of that, public transport is affordable.",
        topic: "City life",
      },
      "On top of that, the city have many jobs.",
    );

    expect(message).toContain("Target chunk: on top of that");
    expect(message).toContain("My answer: On top of that, the city have many jobs.");
    expect(message).toContain("Please correct it if needed");
  });
});
