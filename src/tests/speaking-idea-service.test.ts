import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { speakingIdeaFormSchema } from "@/lib/validation";

const speakingIdeaFindMany = vi.fn();
const speakingIdeaFindUnique = vi.fn();
const speakingIdeaCreate = vi.fn();
const speakingIdeaUpdate = vi.fn();
const speakingIdeaVariantCreateMany = vi.fn();
const speakingIdeaVariantDeleteMany = vi.fn();
const speakingIdeaSupportCreateMany = vi.fn();
const speakingIdeaSupportDeleteMany = vi.fn();
const speakingIdeaPatternCreateMany = vi.fn();
const speakingIdeaPatternDeleteMany = vi.fn();
const speakingIdeaQuestionMapCreateMany = vi.fn();
const speakingIdeaQuestionMapDeleteMany = vi.fn();
const speakingIdeaQuestionMapUpdateMany = vi.fn();
const ieltsQuestionFindMany = vi.fn();
const transaction = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    $transaction: transaction,
    speakingIdea: {
      findMany: speakingIdeaFindMany,
      findUnique: speakingIdeaFindUnique,
      create: speakingIdeaCreate,
      update: speakingIdeaUpdate,
    },
    ieltsQuestion: {
      findMany: ieltsQuestionFindMany,
    },
  },
}));

let saveSpeakingIdea: typeof import("@/server/data/speaking-ideas").saveSpeakingIdea;
let setSpeakingIdeaStatus: typeof import("@/server/data/speaking-ideas").setSpeakingIdeaStatus;

beforeAll(async () => {
  ({ saveSpeakingIdea, setSpeakingIdeaStatus } = await import(
    "@/server/data/speaking-ideas"
  ));
});

describe("speaking idea validation", () => {
  it("rejects duplicate linked questions and multiple primary flags", () => {
    expect(() =>
      speakingIdeaFormSchema.parse({
        title: "Saving time",
        shortLabel: "Time-saving",
        descriptionVi: "Giup tiet kiem thoi gian trong nhieu tinh huong hang ngay.",
        descriptionEn: "Helps save time in many day-to-day situations.",
        popularityScore: 4,
        reuseScore: 5,
        status: "ACTIVE",
        variants: [],
        supports: [],
        patterns: [],
        questionMaps: [
          {
            speakingQuestionId: "question-1",
            relevanceScore: 5,
            isPrimary: true,
          },
          {
            speakingQuestionId: "question-1",
            relevanceScore: 4,
            isPrimary: true,
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects invalid pattern variables JSON", () => {
    expect(() =>
      speakingIdeaFormSchema.parse({
        title: "Building confidence",
        shortLabel: "Confidence",
        descriptionVi: "Y tuong nay giup noi ve viec tu tin hon khi thu dieu moi.",
        descriptionEn: "This idea helps explain becoming more confident over time.",
        popularityScore: 4,
        reuseScore: 4,
        status: "DRAFT",
        variants: [],
        supports: [],
        patterns: [
          {
            patternText: "It helps me feel more confident because...",
            variablesJson: "{bad json",
            exampleAnswer: "It helps me feel more confident because I get used to speaking up.",
          },
        ],
        questionMaps: [],
      }),
    ).toThrow("Pattern variables JSON must be valid JSON.");
  });
});

describe("speaking idea service", () => {
  beforeEach(() => {
    speakingIdeaFindMany.mockReset();
    speakingIdeaFindUnique.mockReset();
    speakingIdeaCreate.mockReset();
    speakingIdeaUpdate.mockReset();
    speakingIdeaVariantCreateMany.mockReset();
    speakingIdeaVariantDeleteMany.mockReset();
    speakingIdeaSupportCreateMany.mockReset();
    speakingIdeaSupportDeleteMany.mockReset();
    speakingIdeaPatternCreateMany.mockReset();
    speakingIdeaPatternDeleteMany.mockReset();
    speakingIdeaQuestionMapCreateMany.mockReset();
    speakingIdeaQuestionMapDeleteMany.mockReset();
    speakingIdeaQuestionMapUpdateMany.mockReset();
    ieltsQuestionFindMany.mockReset();
    transaction.mockReset();
    transaction.mockImplementation(async (callback) =>
      callback({
        speakingIdea: {
          create: speakingIdeaCreate,
          update: speakingIdeaUpdate,
          findMany: speakingIdeaFindMany,
        },
        speakingIdeaVariant: {
          createMany: speakingIdeaVariantCreateMany,
          deleteMany: speakingIdeaVariantDeleteMany,
        },
        speakingIdeaSupport: {
          createMany: speakingIdeaSupportCreateMany,
          deleteMany: speakingIdeaSupportDeleteMany,
        },
        speakingIdeaPattern: {
          createMany: speakingIdeaPatternCreateMany,
          deleteMany: speakingIdeaPatternDeleteMany,
        },
        speakingIdeaQuestionMap: {
          createMany: speakingIdeaQuestionMapCreateMany,
          deleteMany: speakingIdeaQuestionMapDeleteMany,
          updateMany: speakingIdeaQuestionMapUpdateMany,
        },
      }),
    );
  });

  it("creates a speaking idea with nested variants, supports, patterns, and links", async () => {
    const values = speakingIdeaFormSchema.parse({
      title: "Saving money",
      shortLabel: "Cost-saving",
      descriptionVi: "Y tuong nay dung de noi ve viec tiet kiem chi phi va tranh lang phi.",
      descriptionEn: "This idea is useful for talking about cutting costs and avoiding waste.",
      popularityScore: 4,
      reuseScore: 5,
      status: "ACTIVE",
      variants: [
        {
          bandLevel: 6.5,
          phrase: "It helps me save a fair amount of money",
          exampleSentence: "It helps me save a fair amount of money every month.",
        },
      ],
      supports: [
        {
          supportType: "REASON",
          text: "The main reason is that it reduces unnecessary spending.",
          example: "For instance, I no longer buy things on impulse.",
        },
      ],
      patterns: [
        {
          patternText: "One key benefit is that it helps me [benefit].",
          variablesJson: "{\"benefit\":\"save money\"}",
          exampleAnswer: "One key benefit is that it helps me save money in the long run.",
        },
      ],
      questionMaps: [
        {
          speakingQuestionId: "question-1",
          relevanceScore: 5,
          isPrimary: true,
          aiReason: "Fits most Part 3 questions about costs or decisions.",
        },
      ],
    });

    ieltsQuestionFindMany.mockResolvedValue([{ id: "question-1" }]);
    speakingIdeaCreate.mockResolvedValue({ id: "idea-1" });
    speakingIdeaFindMany.mockResolvedValue([
      {
        id: "idea-1",
        title: values.title,
        shortLabel: values.shortLabel,
        descriptionVi: values.descriptionVi,
        descriptionEn: values.descriptionEn,
        popularityScore: values.popularityScore,
        reuseScore: values.reuseScore,
        status: values.status,
        aiReason: null,
        generatedBatchId: null,
        createdAt: new Date("2026-06-16T10:00:00.000Z"),
        updatedAt: new Date("2026-06-16T10:00:00.000Z"),
        variants: [
          {
            id: "variant-1",
            bandLevel: 6.5,
            phrase: values.variants[0]?.phrase,
            exampleSentence: values.variants[0]?.exampleSentence,
            createdAt: new Date("2026-06-16T10:00:00.000Z"),
            updatedAt: new Date("2026-06-16T10:00:00.000Z"),
          },
        ],
        supports: [
          {
            id: "support-1",
            supportType: "REASON",
            text: values.supports[0]?.text,
            example: values.supports[0]?.example,
            createdAt: new Date("2026-06-16T10:00:00.000Z"),
            updatedAt: new Date("2026-06-16T10:00:00.000Z"),
          },
        ],
        patterns: [
          {
            id: "pattern-1",
            patternText: values.patterns[0]?.patternText,
            variablesJson: values.patterns[0]?.variablesJson,
            exampleAnswer: values.patterns[0]?.exampleAnswer,
            createdAt: new Date("2026-06-16T10:00:00.000Z"),
            updatedAt: new Date("2026-06-16T10:00:00.000Z"),
          },
        ],
        questionMaps: [
          {
            id: "map-1",
            relevanceScore: 5,
            isPrimary: true,
            aiReason: values.questionMaps[0]?.aiReason,
            createdAt: new Date("2026-06-16T10:00:00.000Z"),
            updatedAt: new Date("2026-06-16T10:00:00.000Z"),
            speakingQuestion: {
              id: "question-1",
              taskType: "PART_3",
              topic: "Money",
              subTopic: "Budgeting",
              prompt: "How can people save more money?",
              targetBand: 6.5,
              status: "APPROVED",
            },
          },
        ],
      },
    ]);

    const result = await saveSpeakingIdea(values);

    expect(speakingIdeaCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Saving money",
        shortLabel: "Cost-saving",
        status: "ACTIVE",
      }),
    });
    expect(speakingIdeaVariantCreateMany).toHaveBeenCalled();
    expect(speakingIdeaSupportCreateMany).toHaveBeenCalled();
    expect(speakingIdeaPatternCreateMany).toHaveBeenCalled();
    expect(speakingIdeaQuestionMapCreateMany).toHaveBeenCalled();
    expect(result.title).toBe("Saving money");
    expect(result.questionMaps).toHaveLength(1);
  });

  it("replaces nested records when updating an existing speaking idea", async () => {
    const values = speakingIdeaFormSchema.parse({
      id: "idea-1",
      title: "Reducing stress",
      shortLabel: "Stress relief",
      descriptionVi: "Y tuong nay dung de noi ve viec giam ap luc va giu tinh than de chiu hon.",
      descriptionEn: "This idea is useful for talking about lowering pressure and feeling more at ease.",
      popularityScore: 5,
      reuseScore: 5,
      status: "ACTIVE",
      variants: [],
      supports: [],
      patterns: [],
      questionMaps: [],
    });

    ieltsQuestionFindMany.mockResolvedValue([]);
    speakingIdeaFindUnique.mockResolvedValue({ id: "idea-1" });
    speakingIdeaUpdate.mockResolvedValue({ id: "idea-1" });
    speakingIdeaFindMany.mockResolvedValue([
      {
        id: "idea-1",
        title: values.title,
        shortLabel: values.shortLabel,
        descriptionVi: values.descriptionVi,
        descriptionEn: values.descriptionEn,
        popularityScore: values.popularityScore,
        reuseScore: values.reuseScore,
        status: values.status,
        aiReason: null,
        generatedBatchId: null,
        createdAt: new Date("2026-06-16T10:00:00.000Z"),
        updatedAt: new Date("2026-06-16T11:00:00.000Z"),
        variants: [],
        supports: [],
        patterns: [],
        questionMaps: [],
      },
    ]);

    await saveSpeakingIdea(values);

    expect(speakingIdeaVariantDeleteMany).toHaveBeenCalledWith({
      where: { ideaId: "idea-1" },
    });
    expect(speakingIdeaSupportDeleteMany).toHaveBeenCalledWith({
      where: { ideaId: "idea-1" },
    });
    expect(speakingIdeaPatternDeleteMany).toHaveBeenCalledWith({
      where: { ideaId: "idea-1" },
    });
    expect(speakingIdeaQuestionMapDeleteMany).toHaveBeenCalledWith({
      where: { ideaId: "idea-1" },
    });
  });

  it("archives a speaking idea through the status updater", async () => {
    speakingIdeaFindUnique.mockResolvedValue({ id: "idea-1" });
    speakingIdeaUpdate.mockResolvedValue({
      id: "idea-1",
      status: "ARCHIVED",
    });

    const result = await setSpeakingIdeaStatus({
      ideaId: "idea-1",
      status: "ARCHIVED",
    });

    expect(speakingIdeaUpdate).toHaveBeenCalledWith({
      where: { id: "idea-1" },
      data: { status: "ARCHIVED" },
    });
    expect(result).toEqual({
      id: "idea-1",
      status: "ARCHIVED",
    });
  });

  it("activates a draft speaking idea through the status updater", async () => {
    speakingIdeaFindUnique.mockResolvedValue({ id: "idea-1" });
    speakingIdeaUpdate.mockResolvedValue({
      id: "idea-1",
      status: "ACTIVE",
    });

    const result = await setSpeakingIdeaStatus({
      ideaId: "idea-1",
      status: "ACTIVE",
    });

    expect(speakingIdeaUpdate).toHaveBeenCalledWith({
      where: { id: "idea-1" },
      data: { status: "ACTIVE" },
    });
    expect(result).toEqual({
      id: "idea-1",
      status: "ACTIVE",
    });
  });
});
