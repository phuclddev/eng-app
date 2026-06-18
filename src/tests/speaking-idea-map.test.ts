import { describe, expect, it } from "vitest";

import { buildSpeakingIdeaMindMap } from "@/lib/speaking-idea-map";
import type { SpeakingIdeaRecord } from "@/lib/types";

function createIdea(overrides: Partial<SpeakingIdeaRecord>): SpeakingIdeaRecord {
  return {
    id: "idea-1",
    title: "Saving time",
    shortLabel: "Time",
    descriptionVi: "Tiet kiem thoi gian",
    descriptionEn: "Talk about convenience and time efficiency.",
    popularityScore: 4,
    reuseScore: 5,
    status: "ACTIVE",
    aiReason: null,
    generatedBatchId: null,
    createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
    variants: [
      {
        id: "variant-1",
        bandLevel: 6.5,
        phrase: "It saves me a lot of time",
        exampleSentence: "It saves me a lot of time on busy weekdays.",
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
    ],
    supports: [
      {
        id: "support-1",
        supportType: "REASON",
        text: "I can finish things faster",
        example: "For example, I can get ready much faster.",
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
    ],
    patterns: [],
    questionMaps: [
      {
        id: "map-1",
        relevanceScore: 5,
        isPrimary: true,
        aiReason: null,
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        speakingQuestion: {
          id: "question-1",
          taskType: "PART_1",
          topic: "Daily routine",
          subTopic: null,
          prompt: "How do you save time in your day?",
          targetBand: 6.5,
          status: "APPROVED",
        },
      },
    ],
    ...overrides,
  };
}

describe("buildSpeakingIdeaMindMap", () => {
  it("builds visual nodes with derived size and branch data", () => {
    const result = buildSpeakingIdeaMindMap([createIdea({})]);

    expect(result.topicOptions).toEqual(["Daily routine"]);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]).toMatchObject({
      title: "Saving time",
      questionCount: 1,
      nodeSize: "large",
    });
    expect(result.nodes[0].variants[0].label).toContain("Band 6.5");
    expect(result.nodes[0].supports[0].supportType).toBe("REASON");
    expect(result.nodes[0].questions[0].taskType).toBe("PART_1");
  });

  it("filters by topic, status, minimum reuse score, and question part", () => {
    const ideas = [
      createIdea({}),
      createIdea({
        id: "idea-2",
        title: "Reducing stress",
        shortLabel: "Stress",
        reuseScore: 2,
        status: "DRAFT",
        questionMaps: [
          {
            id: "map-2",
            relevanceScore: 4,
            isPrimary: true,
            aiReason: null,
            createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
            updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
            speakingQuestion: {
              id: "question-2",
              taskType: "PART_3",
              topic: "Work-life balance",
              subTopic: null,
              prompt: "How can hobbies reduce stress?",
              targetBand: 7,
              status: "APPROVED",
            },
          },
        ],
      }),
    ];

    const result = buildSpeakingIdeaMindMap(ideas, {
      topic: "Daily routine",
      status: "ACTIVE",
      minReuseScore: 4,
      questionPart: "PART_1",
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("idea-1");
  });
});
