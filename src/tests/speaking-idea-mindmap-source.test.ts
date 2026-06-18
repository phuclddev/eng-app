import { describe, expect, it } from "vitest";

import {
  buildSpeakingIdeaMindMapExportBaseName,
  formatSpeakingIdeaMindMapSource,
  generateSpeakingIdeaMindMapSource,
  getSpeakingIdeaMindMapRecord,
} from "@/lib/speaking-idea-mindmap-source";
import type { SpeakingIdeaRecord } from "@/lib/types";
import { speakingIdeaMindMapSchema } from "@/lib/validation";

function createIdea(): SpeakingIdeaRecord {
  return {
    id: "idea-1",
    title: "Access to information",
    shortLabel: "Information",
    descriptionVi: "Y tuong nay giup noi ve viec tiep can thong tin nhanh va de dang hon.",
    descriptionEn: "This idea explains why people value getting information quickly and easily.",
    popularityScore: 5,
    reuseScore: 5,
    status: "ACTIVE",
    aiReason: null,
    generatedBatchId: null,
    mindMapSourceType: "MERMAID",
    mindMapSourceText: null,
    mindMapRenderedTitle: null,
    createdAt: "2026-06-18T08:00:00.000Z",
    updatedAt: "2026-06-18T08:00:00.000Z",
    variants: [
      {
        id: "variant-1",
        bandLevel: 5.5,
        phrase: "get information quickly",
        exampleSentence: "People can get information quickly from their phones.",
        createdAt: "2026-06-18T08:00:00.000Z",
        updatedAt: "2026-06-18T08:00:00.000Z",
      },
      {
        id: "variant-2",
        bandLevel: 7.5,
        phrase: "it gives them easy access to information",
        exampleSentence: "It gives them easy access to information wherever they are.",
        createdAt: "2026-06-18T08:00:00.000Z",
        updatedAt: "2026-06-18T08:00:00.000Z",
      },
    ],
    supports: [
      {
        id: "support-1",
        supportType: "REASON",
        text: "Instead of asking other people, they can check the information online in a few minutes.",
        example: "For example, they can compare products or find study materials immediately.",
        createdAt: "2026-06-18T08:00:00.000Z",
        updatedAt: "2026-06-18T08:00:00.000Z",
      },
    ],
    patterns: [
      {
        id: "pattern-1",
        patternText: "People use X because it gives them easy access to information.",
        variablesJson: null,
        exampleAnswer: "People use smartphones because they give users easy access to information.",
        createdAt: "2026-06-18T08:00:00.000Z",
        updatedAt: "2026-06-18T08:00:00.000Z",
      },
    ],
    questionMaps: [
      {
        id: "map-1",
        relevanceScore: 5,
        isPrimary: true,
        aiReason: null,
        createdAt: "2026-06-18T08:00:00.000Z",
        updatedAt: "2026-06-18T08:00:00.000Z",
        speakingQuestion: {
          id: "question-1",
          taskType: "PART_3",
          topic: "Technology",
          subTopic: null,
          prompt: "Why do people use smartphones so much?",
          targetBand: 6.5,
          status: "APPROVED",
        },
      },
    ],
  };
}

describe("speaking idea Mermaid source helpers", () => {
  it("generates a Mermaid mind map source with reusable branches", () => {
    const source = generateSpeakingIdeaMindMapSource(createIdea());

    expect(source).toContain("mindmap");
    expect(source).toContain("root((Access to information))");
    expect(source).toContain("Simple version");
    expect(source).toContain("Band upgrade");
    expect(source).toContain("Supporting logic");
    expect(source).toContain("Reusable answer pattern");
    expect(source).toContain("Applicable questions");
  });

  it("prefers saved custom source while keeping idea data unchanged", () => {
    const idea = createIdea();
    const frozenBefore = JSON.stringify(idea);
    const record = getSpeakingIdeaMindMapRecord({
      ...idea,
      mindMapSourceText: "mindmap\n  root((Custom map))",
      mindMapRenderedTitle: "Custom map",
    });

    expect(record.sourceText).toBe("mindmap\n  root((Custom map))");
    expect(record.renderedTitle).toBe("Custom map");
    expect(JSON.stringify(idea)).toBe(frozenBefore);
  });

  it("formats source and generates export-safe filenames", () => {
    expect(formatSpeakingIdeaMindMapSource("mindmap  \n  root((Idea)) \n")).toBe(
      "mindmap\n  root((Idea))",
    );
    expect(buildSpeakingIdeaMindMapExportBaseName(createIdea())).toBe(
      "speaking-idea-map-information",
    );
  });

  it("rejects invalid Mermaid source input on save", () => {
    expect(() =>
      speakingIdeaMindMapSchema.parse({
        ideaId: "idea-1",
        sourceType: "MERMAID",
        sourceText: "graph TD\nA-->B",
      }),
    ).toThrow("mindmap");
  });
});
