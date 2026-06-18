import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const speakingIdeaFindMany = vi.fn();
const ieltsQuestionFindMany = vi.fn();

vi.mock("@/server/prisma", () => ({
  prisma: {
    speakingIdea: {
      findMany: speakingIdeaFindMany,
    },
    ieltsQuestion: {
      findMany: ieltsQuestionFindMany,
    },
  },
}));

let getSpeakingIdeaCoverageSnapshot: typeof import("@/server/data/speaking-ideas").getSpeakingIdeaCoverageSnapshot;

beforeAll(async () => {
  ({ getSpeakingIdeaCoverageSnapshot } = await import("@/server/data/speaking-ideas"));
});

beforeEach(() => {
  speakingIdeaFindMany.mockReset();
  ieltsQuestionFindMany.mockReset();
});

describe("speaking idea coverage service", () => {
  it("calculates top ideas and unmapped questions from active mappings", async () => {
    speakingIdeaFindMany.mockResolvedValue([
      {
        id: "idea-1",
        title: "Saving time",
        shortLabel: "Time",
        reuseScore: 5,
        popularityScore: 4,
        questionMaps: [{ speakingQuestionId: "q-1" }, { speakingQuestionId: "q-2" }],
      },
      {
        id: "idea-2",
        title: "Reducing stress",
        shortLabel: "Stress",
        reuseScore: 4,
        popularityScore: 3,
        questionMaps: [],
      },
    ]);
    ieltsQuestionFindMany.mockResolvedValue([
      {
        id: "q-1",
        taskType: "PART_1",
        topic: "Daily routine",
        subTopic: null,
        prompt: "How do you save time?",
        targetBand: 6.5,
        ideaMappings: [{ ideaId: "idea-1" }],
      },
      {
        id: "q-2",
        taskType: "PART_2",
        topic: "Work",
        subTopic: null,
        prompt: "Describe a busy day.",
        targetBand: 6.5,
        ideaMappings: [{ ideaId: "idea-1" }],
      },
      {
        id: "q-3",
        taskType: "PART_3",
        topic: "Work",
        subTopic: null,
        prompt: "Why are people stressed at work?",
        targetBand: 7,
        ideaMappings: [],
      },
    ]);

    const snapshot = await getSpeakingIdeaCoverageSnapshot();

    expect(snapshot.totalActiveIdeas).toBe(2);
    expect(snapshot.totalMappedQuestions).toBe(2);
    expect(snapshot.questionsWithoutIdeas).toBe(1);
    expect(snapshot.ideasWithNoLinkedQuestions).toBe(1);
    expect(snapshot.topIdeas[0]).toMatchObject({
      id: "idea-1",
      linkedQuestionsCount: 2,
      generatedAnswersCount: 0,
    });
    expect(snapshot.unmappedQuestions[0]).toMatchObject({
      id: "q-3",
      taskType: "PART_3",
    });
  });

  it("calculates weak topics and part coverage", async () => {
    speakingIdeaFindMany.mockResolvedValue([
      {
        id: "idea-1",
        title: "Saving money",
        shortLabel: "Money",
        reuseScore: 5,
        popularityScore: 5,
        questionMaps: [{ speakingQuestionId: "q-1" }],
      },
    ]);
    ieltsQuestionFindMany.mockResolvedValue([
      {
        id: "q-1",
        taskType: "PART_1",
        topic: "Money",
        subTopic: null,
        prompt: "Do you save money?",
        targetBand: 6,
        ideaMappings: [{ ideaId: "idea-1" }],
      },
      {
        id: "q-2",
        taskType: "PART_1",
        topic: "Money",
        subTopic: null,
        prompt: "Is saving money important?",
        targetBand: 6,
        ideaMappings: [],
      },
      {
        id: "q-3",
        taskType: "PART_2",
        topic: "Travel",
        subTopic: null,
        prompt: "Describe a trip.",
        targetBand: 6.5,
        ideaMappings: [],
      },
    ]);

    const snapshot = await getSpeakingIdeaCoverageSnapshot();

    expect(snapshot.weakTopics[0]).toMatchObject({
      topic: "Travel",
      questionCount: 1,
      mappedCount: 0,
      coveragePercent: 0,
    });
    expect(snapshot.coverageByPart.find((item) => item.taskType === "PART_1")).toMatchObject({
      questionCount: 2,
      mappedCount: 1,
      unmappedCount: 1,
      coveragePercent: 50,
    });
    expect(snapshot.coverageByPart.find((item) => item.taskType === "PART_2")).toMatchObject({
      questionCount: 1,
      mappedCount: 0,
      unmappedCount: 1,
      coveragePercent: 0,
    });
  });
});
