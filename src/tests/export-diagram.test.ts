import { afterEach, describe, expect, it } from "vitest";

import { normalizeSvgMarkupForExport } from "@/lib/export-diagram";

// @ts-expect-error jsdom is available in devDependencies but does not ship local typings here
const { JSDOM } = await import("jsdom");

const originalDomParser = globalThis.DOMParser;
const originalXmlSerializer = globalThis.XMLSerializer;

afterEach(() => {
  globalThis.DOMParser = originalDomParser;
  globalThis.XMLSerializer = originalXmlSerializer;
});

describe("normalizeSvgMarkupForExport", () => {
  it("adds width and height when they are missing but viewBox exists", () => {
    const dom = new JSDOM("");
    globalThis.DOMParser = dom.window.DOMParser as typeof DOMParser;
    globalThis.XMLSerializer = dom.window.XMLSerializer as typeof XMLSerializer;

    const result = normalizeSvgMarkupForExport(
      '<svg viewBox="0 0 640 480"><g><text>Hello</text></g></svg>',
      "Study map",
    );

    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
    expect(result.svgMarkup).toContain('width="640"');
    expect(result.svgMarkup).toContain('height="480"');
    expect(result.svgMarkup).toContain(">Study map</title>");
  });

  it("keeps explicit width and height when already present", () => {
    const dom = new JSDOM("");
    globalThis.DOMParser = dom.window.DOMParser as typeof DOMParser;
    globalThis.XMLSerializer = dom.window.XMLSerializer as typeof XMLSerializer;

    const result = normalizeSvgMarkupForExport(
      '<svg width="800" height="600"><g /></svg>',
      "Study map",
    );

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.svgMarkup).toContain('viewBox="0 0 800 600"');
  });
});
