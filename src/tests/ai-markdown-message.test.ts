import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AiMarkdownMessage } from "@/components/ai/ai-markdown-message";

describe("AiMarkdownMessage", () => {
  it("renders common markdown formatting for AI responses", () => {
    const html = renderToStaticMarkup(
      createElement(AiMarkdownMessage, {
        content: [
          "### Overall feedback",
          "",
          "**Strong point** and *natural phrasing*.",
          "",
          "- Use more precise chunks",
          "- Keep the answer concise",
          "",
          "1. Add one example",
          "2. Rehearse again",
          "",
          "Try `make the most of` in your answer.",
          "",
          "Line one",
          "Line two",
        ].join("\n"),
      }),
    );

    expect(html).toContain("<h3>Overall feedback</h3>");
    expect(html).toContain("<strong>Strong point</strong>");
    expect(html).toContain("<em>natural phrasing</em>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<code>make the most of</code>");
    expect(html).toContain("<br/>");
  });

  it("does not render raw html", () => {
    const html = renderToStaticMarkup(
      createElement(AiMarkdownMessage, {
        content: 'Safe text <script>alert("xss")</script> after.',
      }),
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("Safe text");
    expect(html).toContain("after.");
  });
});
