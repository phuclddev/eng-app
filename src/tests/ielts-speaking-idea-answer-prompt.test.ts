import { describe, expect, it } from "vitest";

import { buildIeltsSpeakingIdeaAnswerPrompt } from "@/server/ai/prompts/ielts-speaking-idea-answer";

describe("ielts speaking idea answer prompt", () => {
  it("includes reusable patterns and support points in the prompt", () => {
    const prompt = buildIeltsSpeakingIdeaAnswerPrompt({
      question: {
        taskType: "PART_3",
        topic: "Technology",
        subTopic: "Online shopping",
        prompt: "Why do people shop online?",
        supportingPoints: [],
      },
      idea: {
        title: "Saving time",
        shortLabel: "Time-saving",
        descriptionVi: "Giac phong thoi gian va giam bat tien.",
        descriptionEn: "People prefer options that save time and reduce friction.",
        variants: [
          {
            bandLevel: 6.5,
            phrase: "save time",
            exampleSentence: "It helps people save time in their daily routine.",
          },
        ],
        supports: [
          {
            supportType: "REASON",
            text: "People want faster and more convenient options.",
            example: "They can buy things in a few clicks.",
          },
        ],
        patterns: [
          {
            patternText: "People do X mainly because...",
            exampleAnswer: "People shop online mainly because it is faster.",
          },
        ],
        mappingReason: "This question is about convenience and efficiency.",
      },
      targetBand: 6.5,
      length: "MEDIUM",
      recommendedChunks: [
        {
          chunk: "save time",
          meaningVi: "tiet kiem thoi gian",
          usageRole: "REASON",
          exampleSentence: null,
          bandLevel: 6.5,
          example: "Online shopping can save time.",
          source: "RECOMMENDED",
          topic: "Technology",
        },
      ],
    });

    expect(prompt).toContain("Reusable answer patterns:");
    expect(prompt).toContain("People do X mainly because...");
    expect(prompt).toContain("Support points:");
    expect(prompt).toContain("People want faster and more convenient options.");
    expect(prompt).toContain("Why this idea matches the question: This question is about convenience and efficiency.");
  });
});
