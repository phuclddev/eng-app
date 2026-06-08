import { describe, expect, it } from "vitest";

import { extractUsedChunksFromSampleAnswer } from "@/server/ai/sample-answer-service";

describe("sample answer service helpers", () => {
  it("matches used chunks from markdown bold markers", () => {
    const usedChunks = extractUsedChunksFromSampleAnswer({
      answer:
        "## Sample answer\nI would say **on top of that** and **from my perspective** are both useful here.",
      selectedChunks: [
        {
          id: "chunk-1",
          chunk: "on top of that",
          meaningVi: "hon nua",
          topic: "Education",
          bandLevel: 6.5,
          usageRole: "SUPPORTING_DETAIL",
        },
        {
          id: "chunk-2",
          chunk: "from my perspective",
          meaningVi: "theo quan diem cua toi",
          topic: null,
          bandLevel: 6,
          usageRole: null,
        },
      ],
    });

    expect(usedChunks.map((chunk) => chunk.id)).toEqual(["chunk-1", "chunk-2"]);
  });

  it("falls back gracefully when the AI answer has no bolded chunks", () => {
    const usedChunks = extractUsedChunksFromSampleAnswer({
      answer: "## Sample answer\nThis is a natural answer but the AI forgot to bold chunks.",
      selectedChunks: [
        {
          id: "chunk-1",
          chunk: "on top of that",
          meaningVi: "hon nua",
          topic: "Education",
          bandLevel: 6.5,
          usageRole: "SUPPORTING_DETAIL",
        },
      ],
    });

    expect(usedChunks).toEqual([]);
  });
});
