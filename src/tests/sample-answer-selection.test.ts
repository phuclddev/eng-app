import { describe, expect, it } from "vitest";

import { selectSampleAnswerChunks } from "@/server/ai/sample-answer-selection";

describe("sample answer chunk selection", () => {
  it("prioritizes recommended chunks, then topic chunks, then general chunks", () => {
    const selected = selectSampleAnswerChunks({
      topic: "Hometown",
      subTopic: "Daily life",
      targetBand: 6.5,
      maxChunks: 4,
      recommendedChunks: [
        {
          id: "recommended-1",
          chunk: "one of the main reasons",
          meaningVi: "mot trong nhung ly do chinh",
          topic: "Hometown",
          bandLevel: 6.5,
          usageRole: "MAIN_IDEA",
          example: "One of the main reasons is the atmosphere.",
          source: "RECOMMENDED",
          sortOrder: 0,
        },
      ],
      sameTopicChunks: [
        {
          id: "topic-1",
          chunk: "a sense of community",
          meaningVi: "cam giac gan ket",
          topic: "Hometown",
          bandLevel: 6.5,
          usageRole: null,
          example: "It gives me a sense of community.",
          source: "TOPIC",
        },
        {
          id: "topic-2",
          chunk: "close-knit neighborhood",
          meaningVi: "khu pho gan ket",
          topic: "Hometown",
          bandLevel: 7,
          usageRole: null,
          example: "It is a close-knit neighborhood.",
          source: "TOPIC",
        },
      ],
      generalChunks: [
        {
          id: "general-1",
          chunk: "from my perspective",
          meaningVi: "theo quan diem cua toi",
          topic: null,
          bandLevel: 6,
          usageRole: null,
          example: "From my perspective, it is ideal for families.",
          source: "GENERAL",
        },
      ],
    });

    expect(selected.map((chunk) => chunk.id)).toEqual([
      "recommended-1",
      "topic-1",
      "topic-2",
      "general-1",
    ]);
  });

  it("deduplicates repeated chunks across sources and respects maxChunks", () => {
    const selected = selectSampleAnswerChunks({
      topic: "Travel",
      subTopic: null,
      targetBand: 6.5,
      maxChunks: 2,
      recommendedChunks: [
        {
          id: "chunk-1",
          chunk: "make the most of",
          meaningVi: "tan dung toi da",
          topic: "Travel",
          bandLevel: 6.5,
          usageRole: "MAIN_IDEA",
          example: "I always try to make the most of short trips.",
          source: "RECOMMENDED",
          sortOrder: 0,
        },
      ],
      sameTopicChunks: [
        {
          id: "chunk-1",
          chunk: "make the most of",
          meaningVi: "tan dung toi da",
          topic: "Travel",
          bandLevel: 6.5,
          usageRole: null,
          example: "I always try to make the most of short trips.",
          source: "TOPIC",
        },
        {
          id: "chunk-2",
          chunk: "broaden my horizons",
          meaningVi: "mo rong tam mat",
          topic: "Travel",
          bandLevel: 7,
          usageRole: null,
          example: "Travel helps me broaden my horizons.",
          source: "TOPIC",
        },
      ],
      generalChunks: [
        {
          id: "chunk-3",
          chunk: "at the end of the day",
          meaningVi: "sau cung thi",
          topic: null,
          bandLevel: 6,
          usageRole: null,
          example: "At the end of the day, the experience matters most.",
          source: "GENERAL",
        },
      ],
    });

    expect(selected.map((chunk) => chunk.id)).toEqual(["chunk-1", "chunk-2"]);
  });
});
