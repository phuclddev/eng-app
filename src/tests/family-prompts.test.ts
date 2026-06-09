import { describe, expect, it } from "vitest";

import { buildFamilyChunkExtractionPrompt } from "@/server/ai/prompts/family-chunk-extraction";
import { buildFamilyConversationPrompt } from "@/server/ai/prompts/family-conversation";
import { buildFamilyRoleplayPrompt } from "@/server/ai/prompts/family-roleplay";

describe("family prompt builders", () => {
  it("builds family conversation prompts without IELTS framing", () => {
    const prompt = buildFamilyConversationPrompt({
      familySummary: "Phuc is driving Kiwi and Vivi to school in Hanoi.",
      childFocus: "BOTH",
      conversationLength: "MEDIUM",
      difficulty: 2,
      scenarioCategory: "Routine",
      scenarioDescription: "School commute with sleepy children and traffic.",
      scenarioTitle: "Car ride to school",
      targetLevel: "NATURAL",
      vietnameseSupport: true,
    });

    expect(prompt).toContain("warm, loving, imperfect father-child interaction");
    expect(prompt).toContain("Scenario: Car ride to school");
    expect(prompt).toContain("# Useful Chunks");
    expect(prompt).toContain("Vietnamese support: yes");
    expect(prompt).toContain("Do not use IELTS speaking style or academic explanations.");
  });

  it("builds chunk extraction prompts for home-life language", () => {
    const prompt = buildFamilyChunkExtractionPrompt({
      childFocus: "BOTH",
      familySummary: "Kiwi often asks for a phone in the car.",
      scenarioCategory: "Conflict",
      scenarioDescription: "A child is bargaining for more screen time in the car.",
      conversationMarkdown: "Dad: No phone right now.\nKiwi: Just five minutes, please.",
    });

    expect(prompt).toContain("Return JSON only.");
    expect(prompt).toContain("conflict-resolution phrases");
    expect(prompt).toContain("Scenario category: Conflict");
    expect(prompt).toContain("Just five minutes, please.");
  });

  it("builds roleplay prompts with age-appropriate family tone", () => {
    const prompt = buildFamilyRoleplayPrompt({
      familySummary: "Vivi is playful and sometimes refuses medicine.",
      scenarioTitle: "Vivi refusing medicine",
      userRole: "DAD",
    });

    expect(prompt).toContain("age-appropriate and emotionally believable");
    expect(prompt).toContain("Do not sound academic or IELTS-like.");
    expect(prompt).toContain("User role: DAD");
  });
});
