import { describe, expect, it } from "vitest";

import { buildSpeakingIdeaMindMapScene } from "@/lib/speaking-idea-map";
import type { SpeakingIdeaRecord } from "@/lib/types";

function createIdea(overrides: Partial<SpeakingIdeaRecord>): SpeakingIdeaRecord {
  return {
    id: "idea-1",
    title: "Convenience and saving time",
    shortLabel: "Save time",
    descriptionVi: "Tien loi va giup tiet kiem thoi gian.",
    descriptionEn: "This idea explains why people prefer options that are convenient and time-saving.",
    popularityScore: 4,
    reuseScore: 5,
    status: "ACTIVE",
    aiReason: null,
    generatedBatchId: null,
    mindMapSourceType: "MERMAID",
    mindMapSourceText: null,
    mindMapRenderedTitle: null,
    createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
    variants: [
      {
        id: "variant-1",
        bandLevel: 5.5,
        phrase: "save time",
        exampleSentence: "It helps people save time on busy weekdays.",
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
      {
        id: "variant-2",
        bandLevel: 6.5,
        phrase: "make life easier",
        exampleSentence: "It makes daily life easier for office workers.",
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
      {
        id: "variant-3",
        bandLevel: 7.5,
        phrase: "free up more time for other priorities",
        exampleSentence: "It can free up more time for other priorities such as family and rest.",
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
    ],
    supports: [
      {
        id: "support-1",
        supportType: "REASON",
        text: "Instead of going somewhere physically, people can do it from home.",
        example: "For example, they can buy things from home in just a few minutes.",
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
      {
        id: "support-2",
        supportType: "RESULT",
        text: "As a result, it has become increasingly popular.",
        example: null,
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
      },
    ],
    patterns: [
      {
        id: "pattern-1",
        patternText: "People do X mainly because it is more convenient and saves time.",
        exampleAnswer:
          "People shop online mainly because it is more convenient and saves time, especially when they are busy.",
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
          topic: "Technology",
          subTopic: null,
          prompt: "Why do people use smartphones so much?",
          targetBand: 6.5,
          status: "APPROVED",
        },
      },
      {
        id: "map-2",
        relevanceScore: 4,
        isPrimary: false,
        aiReason: null,
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        speakingQuestion: {
          id: "question-2",
          taskType: "PART_3",
          topic: "Shopping",
          subTopic: null,
          prompt: "Why is online shopping so common?",
          targetBand: 6.5,
          status: "APPROVED",
        },
      },
    ],
    ...overrides,
  };
}

describe("buildSpeakingIdeaMindMapScene", () => {
  it("keeps overview mode clean with only idea nodes", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [createIdea({})],
      mode: "OVERVIEW",
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
    expect(result.nodes.every((node) => node.kind === "idea")).toBe(true);
  });

  it("builds a memorization-oriented focus scene with meaningful branches", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [createIdea({})],
      mode: "FOCUS",
      selectedIdeaId: "idea-1",
    });

    expect(result.selectedIdeaId).toBe("idea-1");
    expect(result.nodes.some((node) => node.kind === "root")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "branch" && node.label === "Simple version")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "branch" && node.label === "Useful chunks")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "branch" && node.label === "Applicable questions")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "leaf" && node.category === "simple")).toBe(true);
    expect(result.nodes.some((node) => node.kind === "leaf" && node.category === "question")).toBe(true);
  });

  it("limits branch leaves to avoid node explosion", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [
        createIdea({
          supports: Array.from({ length: 12 }, (_item, index) => ({
            id: `support-${index}`,
            supportType: "DETAIL",
            text: `Support point ${index}. It reduces unnecessary effort and saves time.`,
            example: `Example ${index}`,
            createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
            updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
          })),
        }),
      ],
      mode: "FOCUS",
      selectedIdeaId: "idea-1",
    });

    const supportLeaves = result.nodes.filter(
      (node) => node.kind === "leaf" && node.category === "support",
    );

    expect(supportLeaves.length).toBeLessThanOrEqual(6);
  });

  it("builds a concise memorize view with main idea, support, and result only", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [createIdea({})],
      mode: "FOCUS",
      selectedIdeaId: "idea-1",
      memorizeView: true,
    });

    const branchLabels = result.nodes
      .filter((node) => node.kind === "branch")
      .map((node) => node.label);

    expect(branchLabels).toEqual(["Main idea", "Support", "Result"]);
    expect(
      result.nodes.filter((node) => node.kind === "leaf" && node.category === "memorize"),
    ).toHaveLength(3);
  });

  it("applies search and structural filters before rendering", () => {
    const ideas = [
      createIdea({}),
      createIdea({
        id: "idea-2",
        title: "Reducing stress",
        shortLabel: "Stress",
        status: "DRAFT",
        reuseScore: 2,
        questionMaps: [
          {
            id: "map-3",
            relevanceScore: 4,
            isPrimary: true,
            aiReason: null,
            createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
            updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
            speakingQuestion: {
              id: "question-3",
              taskType: "PART_2",
              topic: "Health",
              subTopic: null,
              prompt: "Describe a hobby that helps you relax.",
              targetBand: 6,
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
        search: "convenient and time-saving",
        topic: "Technology",
        status: "ACTIVE",
        minReuseScore: 4,
        questionPart: "PART_1",
      },
    });

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].label).toBe("Convenience and saving time");
  });

  it("keeps focus mode empty until an idea is explicitly selected", () => {
    const result = buildSpeakingIdeaMindMapScene({
      ideas: [createIdea({})],
      mode: "FOCUS",
    });

    expect(result.selectedIdeaId).toBeNull();
    expect(result.nodes).toHaveLength(0);
  });
});
