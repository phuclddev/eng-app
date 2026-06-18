import type {
  IeltsTaskType,
  SpeakingIdeaQuestionMapRecord,
  SpeakingIdeaRecord,
  SpeakingIdeaStatus,
} from "@/lib/types";

export type SpeakingIdeaMapFilters = {
  search?: string;
  topic?: string;
  status?: SpeakingIdeaStatus | "ALL";
  minReuseScore?: number;
  questionPart?: IeltsTaskType | "ALL";
};

export type SpeakingIdeaMapMode = "OVERVIEW" | "FOCUS";
export type SpeakingIdeaMapNodeSize = "small" | "medium" | "large";
export type SpeakingIdeaMapNodeKind =
  | "idea"
  | "branch"
  | "variant"
  | "support"
  | "question"
  | "pattern";

export type SpeakingIdeaMapGraphNode = {
  id: string;
  kind: SpeakingIdeaMapNodeKind;
  label: string;
  secondaryLabel?: string;
  body?: string;
  href?: string;
  tooltip?: string;
  nodeSize: SpeakingIdeaMapNodeSize;
  width: number;
  height: number;
  position: {
    x: number;
    y: number;
  };
  accentColor: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type SpeakingIdeaMapGraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type SpeakingIdeaMapScene = {
  mode: SpeakingIdeaMapMode;
  topicOptions: string[];
  ideaOptions: Array<{
    id: string;
    title: string;
    shortLabel: string;
  }>;
  nodes: SpeakingIdeaMapGraphNode[];
  edges: SpeakingIdeaMapGraphEdge[];
  hiddenIdeaCount: number;
  selectedIdeaId: string | null;
  selectedIdeaTitle?: string;
  totalIdeas: number;
};

type BuildSceneInput = {
  ideas: SpeakingIdeaRecord[];
  filters?: SpeakingIdeaMapFilters;
  mode?: SpeakingIdeaMapMode;
  selectedIdeaId?: string | null;
  overviewLimit?: number;
};

const OVERVIEW_NODE_DIMENSIONS = {
  small: { width: 250, height: 124 },
  medium: { width: 292, height: 142 },
  large: { width: 336, height: 164 },
} as const;

const DETAIL_NODE_DIMENSIONS = {
  idea: {
    small: { width: 300, height: 148 },
    medium: { width: 340, height: 168 },
    large: { width: 388, height: 188 },
  },
  branch: { width: 170, height: 68 },
  variant: { width: 250, height: 92 },
  support: { width: 280, height: 110 },
  question: { width: 300, height: 114 },
  pattern: { width: 300, height: 106 },
} as const;

function normalizeFilterValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getQuestionLabel(questionMap: SpeakingIdeaQuestionMapRecord) {
  const { speakingQuestion } = questionMap;
  return `${speakingQuestion.taskType.replace("_", " ")} · ${speakingQuestion.topic}`;
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

function getAccentColor(kind: SpeakingIdeaMapNodeKind) {
  switch (kind) {
    case "idea":
      return "#1d4ed8";
    case "branch":
      return "#475569";
    case "variant":
      return "#0f766e";
    case "support":
      return "#7c3aed";
    case "question":
      return "#b45309";
    case "pattern":
      return "#be185d";
    default:
      return "#334155";
  }
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

function matchesSearch(idea: SpeakingIdeaRecord, search?: string) {
  const query = normalizeFilterValue(search);

  if (!query) {
    return true;
  }

  const haystack = [
    idea.title,
    idea.shortLabel,
    idea.descriptionVi,
    idea.descriptionEn,
    ...idea.supports.map((support) => support.text),
    ...idea.patterns.map((pattern) => pattern.patternText),
    ...idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.prompt),
    ...idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.topic),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function getTopicOptions(ideas: SpeakingIdeaRecord[]) {
  return [
    ...new Set(
      ideas.flatMap((idea) =>
        idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.topic),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function getIdeaOptions(ideas: SpeakingIdeaRecord[]) {
  return ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    shortLabel: idea.shortLabel,
  }));
}

function sortIdeas(ideas: SpeakingIdeaRecord[]) {
  return [...ideas].sort((left, right) => {
    const weightDifference = getNodeWeight(right) - getNodeWeight(left);
    if (weightDifference !== 0) {
      return weightDifference;
    }

    return left.title.localeCompare(right.title);
  });
}

function applyFilters(ideas: SpeakingIdeaRecord[], filters: SpeakingIdeaMapFilters = {}) {
  return sortIdeas(ideas)
    .filter((idea) => matchesStatus(idea, filters.status))
    .filter((idea) => matchesTopic(idea, filters.topic))
    .filter((idea) => matchesQuestionPart(idea, filters.questionPart))
    .filter((idea) => (filters.minReuseScore ? idea.reuseScore >= filters.minReuseScore : true))
    .filter((idea) => matchesSearch(idea, filters.search));
}

function buildOverviewNodes(ideas: SpeakingIdeaRecord[]) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(ideas.length)));
  const nodes: SpeakingIdeaMapGraphNode[] = [];

  ideas.forEach((idea, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const nodeSize = getNodeSize(getNodeWeight(idea));
    const dimensions = OVERVIEW_NODE_DIMENSIONS[nodeSize];
    const topics = [...new Set(idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.topic))]
      .slice(0, 3)
      .join(" • ");
    const questionParts = [
      ...new Set(idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.taskType)),
    ].join(" / ");

    nodes.push({
      id: idea.id,
      kind: "idea",
      label: idea.title,
      secondaryLabel: idea.shortLabel,
      body: idea.descriptionEn,
      href: `/admin/ideas/${idea.id}`,
      tooltip: `${idea.descriptionVi}\n\nLinked questions: ${idea.questionMaps.length}`,
      nodeSize,
      width: dimensions.width,
      height: dimensions.height,
      position: {
        x: column * 390,
        y: row * 230,
      },
      accentColor: getAccentColor("idea"),
      meta: {
        reuseScore: idea.reuseScore,
        popularityScore: idea.popularityScore,
        linkedQuestions: idea.questionMaps.length,
        topics,
        questionParts,
      },
    });
  });

  return nodes;
}

function createBranchNode(
  id: string,
  label: string,
  position: { x: number; y: number },
  count: number,
) {
  return {
    id,
    kind: "branch" as const,
    label,
    secondaryLabel: `${count} item${count === 1 ? "" : "s"}`,
    nodeSize: "medium" as const,
    width: DETAIL_NODE_DIMENSIONS.branch.width,
    height: DETAIL_NODE_DIMENSIONS.branch.height,
    position,
    accentColor: getAccentColor("branch"),
    meta: {
      count,
    },
  };
}

function getVariantBody(phrase: string, exampleSentence: string) {
  return `${phrase}\n${exampleSentence}`;
}

function getSupportBody(text: string, example: string | null) {
  return example ? `${text}\nExample: ${example}` : text;
}

function getQuestionBody(questionMap: SpeakingIdeaQuestionMapRecord) {
  const { speakingQuestion } = questionMap;
  const part = speakingQuestion.taskType.replace("_", " ");
  return `${part} · ${speakingQuestion.topic}\n${speakingQuestion.prompt}`;
}

function getPatternBody(patternText: string, exampleAnswer: string) {
  return `${patternText}\n${exampleAnswer}`;
}

function buildFocusScene(idea: SpeakingIdeaRecord): Pick<SpeakingIdeaMapScene, "nodes" | "edges" | "selectedIdeaId" | "selectedIdeaTitle" | "hiddenIdeaCount"> {
  const rootSize = getNodeSize(getNodeWeight(idea));
  const rootDimensions = DETAIL_NODE_DIMENSIONS.idea[rootSize];
  const nodes: SpeakingIdeaMapGraphNode[] = [
    {
      id: idea.id,
      kind: "idea",
      label: idea.title,
      secondaryLabel: idea.shortLabel,
      body: idea.descriptionEn,
      href: `/admin/ideas/${idea.id}`,
      tooltip: idea.descriptionVi,
      nodeSize: rootSize,
      width: rootDimensions.width,
      height: rootDimensions.height,
      position: { x: 0, y: 0 },
      accentColor: getAccentColor("idea"),
      meta: {
        reuseScore: idea.reuseScore,
        popularityScore: idea.popularityScore,
        linkedQuestions: idea.questionMaps.length,
      },
    },
  ];

  const edges: SpeakingIdeaMapGraphEdge[] = [];

  const branches = [
    {
      id: `${idea.id}-variants`,
      label: "Band variants",
      items: idea.variants.map((variant) => ({
        id: variant.id,
        kind: "variant" as const,
        label: `Band ${variant.bandLevel}`,
        secondaryLabel: variant.phrase,
        body: getVariantBody(variant.phrase, variant.exampleSentence),
        tooltip: variant.exampleSentence,
      })),
      branchPosition: { x: -360, y: -240 },
      itemOrigin: { x: -700, y: -320 },
      itemGap: 118,
    },
    {
      id: `${idea.id}-supports`,
      label: "Support points",
      items: idea.supports.map((support) => ({
        id: support.id,
        kind: "support" as const,
        label: support.supportType.replaceAll("_", " "),
        secondaryLabel: undefined,
        body: getSupportBody(support.text, support.example),
        tooltip: support.example ?? support.text,
      })),
      branchPosition: { x: -360, y: 170 },
      itemOrigin: { x: -740, y: 110 },
      itemGap: 136,
    },
    {
      id: `${idea.id}-questions`,
      label: "Linked questions",
      items: idea.questionMaps.map((questionMap) => ({
        id: questionMap.id,
        kind: "question" as const,
        label: getQuestionLabel(questionMap),
        secondaryLabel: questionMap.isPrimary ? "Primary idea" : `Relevance ${questionMap.relevanceScore}/5`,
        body: getQuestionBody(questionMap),
        tooltip: questionMap.aiReason ?? questionMap.speakingQuestion.prompt,
        href: "/admin/questions",
      })),
      branchPosition: { x: 420, y: -240 },
      itemOrigin: { x: 690, y: -320 },
      itemGap: 136,
    },
    {
      id: `${idea.id}-patterns`,
      label: "Answer patterns",
      items: idea.patterns.map((pattern) => ({
        id: pattern.id,
        kind: "pattern" as const,
        label: "Reusable pattern",
        secondaryLabel: pattern.patternText,
        body: getPatternBody(pattern.patternText, pattern.exampleAnswer),
        tooltip:
          typeof pattern.variablesJson === "object" && pattern.variablesJson
            ? JSON.stringify(pattern.variablesJson)
            : pattern.exampleAnswer,
      })),
      branchPosition: { x: 420, y: 170 },
      itemOrigin: { x: 690, y: 110 },
      itemGap: 132,
    },
  ] as const;

  for (const branch of branches) {
    if (branch.items.length === 0) {
      continue;
    }

    nodes.push(createBranchNode(branch.id, branch.label, branch.branchPosition, branch.items.length));
    edges.push({
      id: `${idea.id}->${branch.id}`,
      source: idea.id,
      target: branch.id,
    });

    branch.items.forEach((item, index) => {
      const dimensions = DETAIL_NODE_DIMENSIONS[item.kind];
      const nodeId = `${branch.id}-${item.id}`;

      nodes.push({
        id: nodeId,
        kind: item.kind,
        label: item.label,
        secondaryLabel: item.secondaryLabel,
        body: item.body,
        href: "href" in item ? item.href : undefined,
        tooltip: item.tooltip,
        nodeSize: "small",
        width: dimensions.width,
        height: dimensions.height,
        position: {
          x: branch.itemOrigin.x,
          y: branch.itemOrigin.y + index * branch.itemGap,
        },
        accentColor: getAccentColor(item.kind),
      });

      edges.push({
        id: `${branch.id}->${nodeId}`,
        source: branch.id,
        target: nodeId,
      });
    });
  }

  return {
    nodes,
    edges,
    selectedIdeaId: idea.id,
    selectedIdeaTitle: idea.title,
    hiddenIdeaCount: 0,
  };
}

export function buildSpeakingIdeaMindMapScene({
  ideas,
  filters = {},
  mode = "OVERVIEW",
  selectedIdeaId = null,
  overviewLimit = 24,
}: BuildSceneInput): SpeakingIdeaMapScene {
  const filteredIdeas = applyFilters(ideas, filters);
  const topicOptions = getTopicOptions(ideas);
  const ideaOptions = getIdeaOptions(filteredIdeas);

  if (mode === "FOCUS") {
    const selectedIdea = selectedIdeaId
      ? filteredIdeas.find((idea) => idea.id === selectedIdeaId) ?? null
      : null;

    if (!selectedIdea) {
      return {
        mode,
        topicOptions,
        ideaOptions,
        nodes: [],
        edges: [],
        hiddenIdeaCount: 0,
        selectedIdeaId: null,
        totalIdeas: filteredIdeas.length,
      };
    }

    const focusScene = buildFocusScene(selectedIdea);
    return {
      mode,
      topicOptions,
      ideaOptions,
      totalIdeas: filteredIdeas.length,
      ...focusScene,
    };
  }

  const visibleIdeas = filteredIdeas.slice(0, overviewLimit);
  return {
    mode,
    topicOptions,
    ideaOptions,
    nodes: buildOverviewNodes(visibleIdeas),
    edges: [],
    hiddenIdeaCount: Math.max(filteredIdeas.length - visibleIdeas.length, 0),
    selectedIdeaId: null,
    totalIdeas: filteredIdeas.length,
  };
}
