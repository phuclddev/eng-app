import { describe, expect, it } from "vitest";

import { buildFamilyChunkExtractionPrompt } from "@/server/ai/prompts/family-chunk-extraction";
import { buildFamilyConversationPrompt } from "@/server/ai/prompts/family-conversation";
import {
  buildFamilyRoleplayFinishPrompt,
  buildFamilyRoleplayStartPrompt,
  buildFamilyRoleplayTurnPrompt,
} from "@/server/ai/prompts/family-roleplay";

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

  it("builds roleplay start prompts with age-appropriate family tone", () => {
    const prompt = buildFamilyRoleplayStartPrompt({
      familySummary: "Vivi is playful and sometimes refuses medicine.",
      aiRole: "VIVI",
      userRole: "FATHER",
      childFocus: "VIVI",
      targetLevel: "NATURAL",
      scenarioTitle: "Vivi refusing medicine",
      scenarioCategory: "Health",
      scenarioDescription: "Bedtime, Vivi has a cough and refuses to take syrup.",
      turnsLimit: 6,
    });

    expect(prompt).toContain("Stay in character");
    expect(prompt).toContain("Avoid IELTS-style or academic phrasing.");
    expect(prompt).toContain("almost-6-year-olds");
    expect(prompt).toContain("Scenario title: Vivi refusing medicine");
    expect(prompt).toContain("Your role (AI character): Vivi");
  });

  it("builds roleplay turn prompts that keep the AI in character", () => {
    const prompt = buildFamilyRoleplayTurnPrompt({
      aiRole: "KIWI",
      userRole: "FATHER",
      childFocus: "KIWI",
      targetLevel: "NATURAL",
      learnerMessage: "Not now sweetie, dinner first.",
      turnNumber: 2,
      turnsLimit: 6,
    });

    expect(prompt).toContain("Stay in character");
    expect(prompt).toContain("Not now sweetie, dinner first.");
    expect(prompt).toContain("turn 2 of about 6");
  });

  it("builds roleplay finish prompts as a Vietnamese coach review", () => {
    const prompt = buildFamilyRoleplayFinishPrompt({
      aiRole: "KIWI",
      userRole: "FATHER",
      targetLevel: "NATURAL",
      transcript: "Dad: Time for dinner.\nKiwi: But I'm not hungry!",
    });

    expect(prompt).toContain("# Overall Feedback");
    expect(prompt).toContain("# Useful Family Chunks");
    expect(prompt).toContain("Markdown only");
    expect(prompt).toContain("Transcript:");
  });
});
