import type {
  IeltsTaskType,
  SpeakingIdeaQuestionMapRecord,
  SpeakingIdeaRecord,
  SpeakingIdeaStatus,
} from "@/lib/types";

export type SpeakingIdeaMapFilters = {
  topic?: string;
  status?: SpeakingIdeaStatus | "ALL";
  minReuseScore?: number;
  questionPart?: IeltsTaskType | "ALL";
};

export type SpeakingIdeaMapNodeSize = "small" | "medium" | "large";

export type SpeakingIdeaMapQuestionNode = {
  id: string;
  label: string;
  topic: string;
  taskType: IeltsTaskType;
  href: string;
  isPrimary: boolean;
  relevanceScore: number;
};

export type SpeakingIdeaMapVariantNode = {
  id: string;
  label: string;
  bandLevel: number;
  exampleSentence: string;
};

export type SpeakingIdeaMapSupportNode = {
  id: string;
  label: string;
  supportType: string;
  example: string | null;
};

export type SpeakingIdeaMapNode = {
  id: string;
  title: string;
  shortLabel: string;
  descriptionVi: string;
  descriptionEn: string;
  href: string;
  status: SpeakingIdeaStatus;
  topics: string[];
  questionParts: IeltsTaskType[];
  reuseScore: number;
  popularityScore: number;
  questionCount: number;
  visualWeight: number;
  nodeSize: SpeakingIdeaMapNodeSize;
  variants: SpeakingIdeaMapVariantNode[];
  supports: SpeakingIdeaMapSupportNode[];
  questions: SpeakingIdeaMapQuestionNode[];
};

export type SpeakingIdeaMapModel = {
  nodes: SpeakingIdeaMapNode[];
  topicOptions: string[];
};

function getQuestionLabel(questionMap: SpeakingIdeaQuestionMapRecord) {
  const { speakingQuestion } = questionMap;
  return `${speakingQuestion.taskType.replace("_", " ")} · ${speakingQuestion.topic}`;
}

function normalizeFilterValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getNodeWeight(idea: SpeakingIdeaRecord) {
  return idea.reuseScore * 2 + idea.popularityScore + Math.min(idea.questionMaps.length, 4);
}

function getNodeSize(weight: number): SpeakingIdeaMapNodeSize {
  if (weight >= 14) {
    return "large";
  }

  if (weight >= 10) {
    return "medium";
  }

  return "small";
}

function matchesTopic(idea: SpeakingIdeaRecord, topic?: string) {
  if (!topic) {
    return true;
  }

  const normalizedTopic = normalizeFilterValue(topic);
  return idea.questionMaps.some(
    (questionMap) => normalizeFilterValue(questionMap.speakingQuestion.topic) === normalizedTopic,
  );
}

function matchesQuestionPart(idea: SpeakingIdeaRecord, questionPart?: IeltsTaskType | "ALL") {
  if (!questionPart || questionPart === "ALL") {
    return true;
  }

  return idea.questionMaps.some(
    (questionMap) => questionMap.speakingQuestion.taskType === questionPart,
  );
}

function matchesStatus(idea: SpeakingIdeaRecord, status?: SpeakingIdeaStatus | "ALL") {
  if (!status || status === "ALL") {
    return true;
  }

  return idea.status === status;
}

export function buildSpeakingIdeaMindMap(
  ideas: SpeakingIdeaRecord[],
  filters: SpeakingIdeaMapFilters = {},
): SpeakingIdeaMapModel {
  const topicOptions = [...new Set(
    ideas.flatMap((idea) =>
      idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.topic),
    ),
  )].sort((left, right) => left.localeCompare(right));

  const nodes = ideas
    .filter((idea) => matchesStatus(idea, filters.status))
    .filter((idea) => matchesTopic(idea, filters.topic))
    .filter((idea) => matchesQuestionPart(idea, filters.questionPart))
    .filter((idea) =>
      filters.minReuseScore ? idea.reuseScore >= filters.minReuseScore : true,
    )
    .map((idea) => {
      const visualWeight = getNodeWeight(idea);
      return {
        id: idea.id,
        title: idea.title,
        shortLabel: idea.shortLabel,
        descriptionVi: idea.descriptionVi,
        descriptionEn: idea.descriptionEn,
        href: `/admin/ideas/${idea.id}`,
        status: idea.status,
        topics: [...new Set(idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.topic))],
        questionParts: [...new Set(idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.taskType))],
        reuseScore: idea.reuseScore,
        popularityScore: idea.popularityScore,
        questionCount: idea.questionMaps.length,
        visualWeight,
        nodeSize: getNodeSize(visualWeight),
        variants: idea.variants.map((variant) => ({
          id: variant.id,
          label: `Band ${variant.bandLevel}: ${variant.phrase}`,
          bandLevel: variant.bandLevel,
          exampleSentence: variant.exampleSentence,
        })),
        supports: idea.supports.map((support) => ({
          id: support.id,
          label: support.text,
          supportType: support.supportType,
          example: support.example,
        })),
        questions: idea.questionMaps.map((questionMap) => ({
          id: questionMap.id,
          label: getQuestionLabel(questionMap),
          topic: questionMap.speakingQuestion.topic,
          taskType: questionMap.speakingQuestion.taskType,
          href: `/admin/questions`,
          isPrimary: questionMap.isPrimary,
          relevanceScore: questionMap.relevanceScore,
        })),
      } satisfies SpeakingIdeaMapNode;
    })
    .sort((left, right) => {
      if (right.visualWeight !== left.visualWeight) {
        return right.visualWeight - left.visualWeight;
      }

      return left.title.localeCompare(right.title);
    });

  return {
    nodes,
    topicOptions,
  };
}
