import { describe, expect, it } from "vitest";

import {
  buildSpeakingAnswerReviewSummary,
  buildChunkCoachSummary,
  buildMissingChunksRequestSummary,
  parseStructuredChunkCoach,
  parseStructuredMissingChunks,
  parseStructuredSimulatorFeedback,
  parseStructuredStudyCoach,
  parseStructuredSpeakingFeedback,
  buildPracticeAiTutorMessage,
  supportsPracticeExerciseAiTutor,
  supportsPracticeMissingChunks,
} from "@/lib/ai-tutor";

describe("AI tutor learner helpers", () => {
  it("marks only production-style practice exercises as AI-eligible", () => {
    expect(supportsPracticeExerciseAiTutor("REWRITE_SENTENCE")).toBe(true);
    expect(supportsPracticeExerciseAiTutor("CREATE_SENTENCE")).toBe(true);
    expect(supportsPracticeExerciseAiTutor("MULTIPLE_CHOICE")).toBe(false);
    expect(supportsPracticeMissingChunks("CREATE_SENTENCE")).toBe(true);
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

  it("builds a structured speaking answer summary payload", () => {
    const summary = buildSpeakingAnswerReviewSummary({
      speakingPart: "PART_3",
      topic: "Education",
      subTopic: "Future schools",
      prompt: "How should schools change in the future?",
      recommendedChunks: [
        {
          chunk: "play a crucial role",
          meaningVi: "đóng vai trò quan trọng",
          usageRole: "MAIN_IDEA",
          exampleSentence: "Teachers will still play a crucial role in guiding students.",
        },
      ],
      userAnswer: "Teacher still very important in the future.",
    });

    expect(summary).toContain("Speaking part: PART_3");
    expect(summary).toContain("Recommended chunks:");
    expect(summary).toContain("User answer: Teacher still very important in the future.");
  });

  it("parses structured speaking feedback into renderable sections", () => {
    const parsed = parseStructuredSpeakingFeedback([
      "1. Overall feedback",
      "Good content, but the answer needs cleaner grammar.",
      "2. Grammar fixes",
      "Use \"Teachers are still very important\".",
      "3. Naturalness",
      "Add one reason and one example to sound less abrupt.",
      "4. Chunk usage",
      "Use \"play a crucial role\" after your main claim.",
      "5. Better version",
      "Teachers still play a crucial role because they guide students beyond textbooks.",
      "6. Suggested chunks",
      "play a crucial role; in the long run",
      "7. Next practice task",
      "Answer again in 4 sentences and include one concrete example.",
    ].join("\n"));

    expect(parsed).toHaveLength(7);
    expect(parsed?.[4]).toMatchObject({
      key: "betterVersion",
      title: "Better version",
    });
  });

  it("falls back to plain text when AI output is not structured", () => {
    expect(
      parseStructuredSpeakingFeedback("This answer is decent, but you should improve grammar."),
    ).toBeNull();
  });

  it("builds missing chunk and chunk coach summaries", () => {
    const missingSummary = buildMissingChunksRequestSummary({
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
    const chunkSummary = buildChunkCoachSummary({
      chunk: "on top of that",
      meaningVi: "hơn nữa",
      example: "On top of that, public transport is affordable.",
      difficulty: 2,
      bandLevel: 6.5,
      grammarPattern: "Sentence connector",
      tags: ["cohesion"],
      wrongExamples: ["On top of that, I very like it."],
      topic: {
        id: "topic-1",
        name: "City life",
        slug: "city-life",
        color: null,
        description: null,
      },
    });

    expect(missingSummary).toContain("Target chunk: on top of that");
    expect(chunkSummary).toContain("Grammar pattern: Sentence connector");
  });

  it("parses the new structured AI section formats", () => {
    expect(
      parseStructuredChunkCoach([
        "1. Meaning in Vietnamese",
        "Mang nghĩa \"hơn nữa\" hoặc \"thêm vào đó\".",
        "2. When to use it",
        "Use it when you want to add a second supporting point.",
        "3. When not to use it",
        "Do not repeat it in every sentence.",
        "4. IELTS Speaking context",
        "Useful when extending an answer naturally.",
        "5. 3 natural example answers",
        "On top of that, the city is affordable.",
        "6. Common Vietnamese learner mistakes",
        "Learners often use it without a first idea.",
        "7. Similar chunks",
        "Besides that; what is more",
        "8. One mini practice task",
        "Answer a Part 1 question with two supporting reasons.",
      ].join("\n")),
    ).toHaveLength(8);

    expect(
      parseStructuredMissingChunks([
        "1. Chunks already used",
        "I like...",
        "2. Missing useful chunks",
        "one of the main reasons",
        "3. Improved answer",
        "One of the main reasons I enjoy Da Nang is that it feels peaceful.",
        "4. Short explanation in Vietnamese",
        "Bạn cần thêm chunk để câu trả lời nghe tự nhiên hơn.",
        "5. Next mini task",
        "Rewrite the answer in 3 sentences.",
      ].join("\n")),
    ).toHaveLength(5);

    expect(
      parseStructuredSimulatorFeedback([
        "1. Estimated band",
        "Around band 6.0",
        "2. Fluency feedback",
        "Ideas were clear but pauses were a bit abrupt.",
        "3. Lexical resource feedback",
        "Vocabulary was safe but accurate.",
        "4. Grammar feedback",
        "Tense control needs to be more stable.",
        "5. Chunk usage",
        "Good attempt, but chunk placement can be smoother.",
        "6. Suggested chunks",
        "from my perspective; one of the main reasons",
        "7. Next practice recommendation",
        "Repeat the same topic with one stronger example.",
      ].join("\n")),
    ).toHaveLength(7);

    expect(
      parseStructuredStudyCoach([
        "1. Short diagnosis",
        "You are consistent, but production accuracy is still weak.",
        "2. Top 3 weaknesses",
        "Production tasks; education topic; overdue reviews",
        "3. 5 recommended chunks to review",
        "play a crucial role; from my perspective",
        "4. 3 speaking prompts to practice",
        "How should schools change in the future?",
        "5. 7-day mini study plan",
        "Day 1 review weak chunks...",
      ].join("\n")),
    ).toHaveLength(5);
  });
});
