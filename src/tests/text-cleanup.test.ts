import { describe, expect, it } from "vitest";

import {
  extractBoldPhrases,
  normalizeAiTextForDisplay,
  stripMarkdownArtifacts,
  stripMarkdownBold,
} from "@/lib/text-cleanup";

describe("stripMarkdownBold", () => {
  it("removes ** bold markers but keeps the inner text", () => {
    expect(stripMarkdownBold("**The main advantage is that** technology helps."))
      .toBe("The main advantage is that technology helps.");
  });

  it("removes __ bold markers but keeps the inner text", () => {
    expect(stripMarkdownBold("__Learn at my own pace__ today."))
      .toBe("Learn at my own pace today.");
  });

  it("removes multiple bold runs in a single string", () => {
    expect(
      stripMarkdownBold(
        "**The main advantage is that** technology can help students **learn at their own pace**.",
      ),
    ).toBe(
      "The main advantage is that technology can help students learn at their own pace.",
    );
  });

  it("preserves apostrophes and ordinary punctuation", () => {
    expect(stripMarkdownBold("It's a parent's role, isn't it?"))
      .toBe("It's a parent's role, isn't it?");
  });

  it("returns empty string unchanged", () => {
    expect(stripMarkdownBold("")).toBe("");
  });
});

describe("stripMarkdownArtifacts", () => {
  it("strips bold, single-asterisk emphasis, and leading bullets", () => {
    const input = "- *Important*: **really** the __key__ point.";
    expect(stripMarkdownArtifacts(input)).toBe(
      "Important: really the key point.",
    );
  });

  it("does not eat lone asterisks attached to whitespace", () => {
    expect(stripMarkdownArtifacts("a * b * c")).toBe("a * b * c");
  });
});

describe("normalizeAiTextForDisplay", () => {
  it("returns empty string for null/undefined", () => {
    expect(normalizeAiTextForDisplay(null)).toBe("");
    expect(normalizeAiTextForDisplay(undefined)).toBe("");
  });

  it("trims whitespace and removes markdown bold markers", () => {
    expect(
      normalizeAiTextForDisplay("  **Learn at my own pace**  "),
    ).toBe("Learn at my own pace");
  });

  it("collapses repeated horizontal whitespace", () => {
    expect(normalizeAiTextForDisplay("a    b   c")).toBe("a b c");
  });

  it("keeps line breaks", () => {
    expect(normalizeAiTextForDisplay("line one\nline two"))
      .toBe("line one\nline two");
  });
});

describe("extractBoldPhrases", () => {
  it("extracts ** bold phrases preserving order", () => {
    const phrases = extractBoldPhrases(
      "**The main advantage is that** tech helps **learn at their own pace**.",
    );
    expect(phrases).toEqual([
      "The main advantage is that",
      "learn at their own pace",
    ]);
  });

  it("deduplicates phrases case-insensitively", () => {
    expect(
      extractBoldPhrases("**make time for** A and **make time for** B"),
    ).toEqual(["make time for"]);
  });

  it("returns an empty array when no bold markers exist", () => {
    expect(extractBoldPhrases("plain sentence with no markup.")).toEqual([]);
  });
});

describe("highlight integration via cleanup", () => {
  it("yields clean text whose chunk phrases still match the original chunk strings", () => {
    const input =
      "**The main advantage is that** technology can help students **learn at their own pace**.";
    const clean = normalizeAiTextForDisplay(input);

    expect(clean).not.toContain("**");
    expect(clean).toContain("The main advantage is that");
    expect(clean).toContain("learn at their own pace");
  });
});
