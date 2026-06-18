import { describe, expect, it } from "vitest";

import { buildSpeakingIdeaMindMapScene } from "@/lib/speaking-idea-map";
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
    patterns: [
      {
        id: "pattern-1",
        patternText: "People choose X because it saves time.",
        exampleAnswer: "People choose public transport because it saves time in traffic.",
        variablesJson: null,
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
    ],
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

describe("buildSpeakingIdeaMindMapScene", () => {
  it("builds clean overview nodes without child detail explosion", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [createIdea({})],
      mode: "OVERVIEW",
    });

    expect(result.topicOptions).toEqual(["Daily routine"]);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
    expect(result.nodes[0]).toMatchObject({
      kind: "idea",
      label: "Saving time",
      nodeSize: "large",
    });
  });

  it("builds a full single-idea focus scene with branch nodes and edges", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [createIdea({})],
      mode: "FOCUS",
      selectedIdeaId: "idea-1",
    });

    expect(result.selectedIdeaId).toBe("idea-1");
    expect(result.edges.length).toBeGreaterThan(0);
    expect(result.nodes.some((node) => node.kind === "branch" && node.label === "Band variants")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "variant")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "support")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "question")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "pattern")).toBe(true);
  });

  it("keeps focus mode empty until an idea is explicitly selected", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [createIdea({})],
      mode: "FOCUS",
    });

    expect(result.selectedIdeaId).toBeNull();
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it("filters by search, topic, status, minimum reuse score, and question part", () => {
    const ideas = [
      createIdea({}),
      createIdea({
        id: "idea-2",
        title: "Reducing stress",
        shortLabel: "Stress",
        descriptionEn: "Talk about relaxation and lowering mental pressure.",
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

    const result = buildSpeakingIdeaMindMapScene({
      ideas,
      mode: "OVERVIEW",
      filters: {
        search: "time efficiency",
        topic: "Daily routine",
        status: "ACTIVE",
        minReuseScore: 4,
        questionPart: "PART_1",
      },
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe("idea-1");
  });

  it("limits overview node count and reports hidden ideas", () => {
    const ideas = Array.from({ length: 5 }, (_item, index) =>
      createIdea({
        id: `idea-${index + 1}`,
        title: `Idea ${index + 1}`,
        shortLabel: `I${index + 1}`,
      }),
    );

    const result = buildSpeakingIdeaMindMapScene({
      ideas,
      mode: "OVERVIEW",
      overviewLimit: 3,
    });

    expect(result.nodes).toHaveLength(3);
    expect(result.hiddenIdeaCount).toBe(2);
    expect(result.nodes.every((node) => node.kind === "idea")).toBe(true);
  });
});
