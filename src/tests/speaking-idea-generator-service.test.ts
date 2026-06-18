import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/errors";

const callAiTutor = vi.fn();
const getSpeakingIdeaIdentitySnapshot = vi.fn();
const createGeneratedSpeakingIdeas = vi.fn();

vi.mock("@/server/ai/ai-chatflow-client", () => ({
  callAiTutor,
}));

vi.mock("@/server/data/speaking-ideas", () => ({
  getSpeakingIdeaIdentitySnapshot,
  createGeneratedSpeakingIdeas,
  normalizeSpeakingIdeaIdentity: (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .slice(0, 191),
}));

let generateSpeakingIdeas: typeof import("@/server/speaking-ideas/idea-generator-service").generateSpeakingIdeas;
let parseSpeakingIdeaGeneratorAnswer: typeof import("@/server/speaking-ideas/idea-generator-service").parseSpeakingIdeaGeneratorAnswer;

beforeAll(async () => {
  ({ generateSpeakingIdeas, parseSpeakingIdeaGeneratorAnswer } = await import(
    "@/server/speaking-ideas/idea-generator-service"
  ));
});

beforeEach(() => {
  callAiTutor.mockReset();
  getSpeakingIdeaIdentitySnapshot.mockReset();
  createGeneratedSpeakingIdeas.mockReset();
});

const validAnswer = JSON.stringify({
  ideas: [
    {
      title: "Saving time",
      shortLabel: "Time-saving",
      descriptionVi: "Y tuong nay giup tra loi cac cau hoi ve su tien loi va hieu qua thoi gian.",
      descriptionEn: "This idea helps explain why something is convenient and time-efficient.",
      popularityScore: 5,
      reuseScore: 5,
      variants: [
        {
          bandLevel: 6,
          phrase: "save time",
          exampleSentence: "Online shopping can save me a lot of time.",
        },
      ],
      supports: [
        {
          supportType: "REASON",
          text: "It cuts down the time I spend on routine tasks.",
          example: "For example, I do not need to travel far.",
        },
      ],
      patterns: [
        {
          patternText: "One main advantage is that it saves time.",
          exampleAnswer: "One main advantage is that it saves time, especially on busy days.",
        },
      ],
      exampleQuestions: ["Why do people shop online?"],
      aiReason: "Rất tái sử dụng cho nhiều câu hỏi đời sống, công nghệ và dịch vụ.",
    },
    {
      title: "Saving time",
      shortLabel: "Efficiency",
      descriptionVi: "Bản trùng lặp.",
      descriptionEn: "Duplicate.",
      popularityScore: 4,
      reuseScore: 4,
      variants: [],
      supports: [],
      patterns: [],
      exampleQuestions: [],
      aiReason: "Duplicate",
    },
  ],
});

describe("parseSpeakingIdeaGeneratorAnswer", () => {
  it("parses valid JSON and normalizes nested fields", () => {
    const parsed = parseSpeakingIdeaGeneratorAnswer(validAnswer);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      title: "Saving time",
      shortLabel: "Time-saving",
      popularityScore: 5,
      reuseScore: 5,
    });
    expect(parsed[0].supports[0]?.supportType).toBe("REASON");
    expect(parsed[0].patterns[0]?.variablesJson).toBeNull();
  });

  it("rejects malformed JSON with AI_TUTOR_INVALID_RESPONSE", () => {
    expect(() => parseSpeakingIdeaGeneratorAnswer("not json")).toThrowError(
      expect.objectContaining({ code: "AI_TUTOR_INVALID_RESPONSE" }),
    );
  });
});

describe("generateSpeakingIdeas", () => {
  it("maps generic AI failure to AI_TUTOR_UNAVAILABLE", async () => {
    getSpeakingIdeaIdentitySnapshot.mockResolvedValue({
      titles: [],
      shortLabels: [],
      normalizedTitles: new Set(),
      normalizedShortLabels: new Set(),
    });
    callAiTutor.mockRejectedValueOnce(new Error("network down"));

    await expect(
      generateSpeakingIdeas({
        actorId: "admin-1",
        payload: {
          count: 10,
          targetBand: 6.5,
          includeExistingContext: true,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UNAVAILABLE" });
  });

  it("rethrows AppError unchanged", async () => {
    getSpeakingIdeaIdentitySnapshot.mockResolvedValue({
      titles: [],
      shortLabels: [],
      normalizedTitles: new Set(),
      normalizedShortLabels: new Set(),
    });
    callAiTutor.mockRejectedValueOnce(
      new AppError("upstream", 502, "AI_TUTOR_UPSTREAM_ERROR"),
    );

    await expect(
      generateSpeakingIdeas({
        actorId: "admin-1",
        payload: {
          count: 10,
          targetBand: 6.5,
          includeExistingContext: true,
        },
      }),
    ).rejects.toMatchObject({ code: "AI_TUTOR_UPSTREAM_ERROR" });
  });

  it("skips duplicate generated ideas and saves drafts", async () => {
    getSpeakingIdeaIdentitySnapshot.mockResolvedValue({
      titles: ["Building confidence"],
      shortLabels: ["Confidence"],
      normalizedTitles: new Set(["building confidence"]),
      normalizedShortLabels: new Set(["confidence"]),
    });
    callAiTutor.mockResolvedValueOnce({
      answer: validAnswer,
      conversationId: "conv-1",
    });
    createGeneratedSpeakingIdeas.mockResolvedValueOnce([
      {
        id: "idea-1",
        title: "Saving time",
        shortLabel: "Time-saving",
        descriptionVi:
          "Y tuong nay giup tra loi cac cau hoi ve su tien loi va hieu qua thoi gian.",
        descriptionEn: "This idea helps explain why something is convenient and time-efficient.",
        popularityScore: 5,
        reuseScore: 5,
        status: "DRAFT",
        aiReason: "Rất tái sử dụng cho nhiều câu hỏi đời sống, công nghệ và dịch vụ.",
        generatedBatchId: "batch-1",
        createdAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-06-16T00:00:00.000Z").toISOString(),
        variants: [],
        supports: [],
        patterns: [],
        questionMaps: [],
      },
    ]);

    const summary = await generateSpeakingIdeas({
      actorId: "admin-1",
      payload: {
        count: 10,
        targetBand: 6.5,
        includeExistingContext: true,
      },
    });

    expect(summary.created).toBe(1);
    expect(summary.skippedDuplicates).toBe(1);
    expect(createGeneratedSpeakingIdeas).toHaveBeenCalledWith(
      expect.objectContaining({
        ideas: [
          expect.objectContaining({
            title: "Saving time",
            shortLabel: "Time-saving",
            aiReason: expect.any(String),
          }),
        ],
      }),
    );
  });

  it("returns a warning when everything is filtered out as duplicate", async () => {
    getSpeakingIdeaIdentitySnapshot.mockResolvedValue({
      titles: ["Saving time"],
      shortLabels: ["Time-saving"],
      normalizedTitles: new Set(["saving time"]),
      normalizedShortLabels: new Set(["time saving"]),
    });
    callAiTutor.mockResolvedValueOnce({
      answer: JSON.stringify({
        ideas: [
          {
            title: "Saving time",
            shortLabel: "Time-saving",
            descriptionVi: "Y tuong trung lap de test bo loc duplicate hop ly.",
            descriptionEn: "Duplicate idea for testing.",
            popularityScore: 5,
            reuseScore: 5,
            variants: [],
            supports: [],
            patterns: [],
            exampleQuestions: [],
            aiReason: "Duplicate",
          },
        ],
      }),
      conversationId: "conv-1",
    });

    const summary = await generateSpeakingIdeas({
      actorId: "admin-1",
      payload: {
        count: 10,
        targetBand: 6.5,
        includeExistingContext: true,
      },
    });

    expect(summary.created).toBe(0);
    expect(summary.skippedDuplicates).toBe(1);
    expect(summary.warnings[0]).toContain("No new reusable ideas");
    expect(createGeneratedSpeakingIdeas).not.toHaveBeenCalled();
  });
});
