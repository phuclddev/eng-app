import type {
  IeltsTaskType,
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
export type SpeakingIdeaMapNodeKind = "root" | "idea" | "branch" | "leaf";
export type SpeakingIdeaMapLeafCategory =
  | "simple"
  | "band"
  | "support"
  | "pattern"
  | "chunk"
  | "question"
  | "sample"
  | "memorize"
  | "cta";

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
  category?: SpeakingIdeaMapLeafCategory;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export type SpeakingIdeaMapGraphEdge = {
  id: string;
  source: string;
  target: string;
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
  memorizeView?: boolean;
  overviewLimit?: number;
};

type BranchLeaf = {
  id: string;
  label: string;
  secondaryLabel?: string;
  tooltip?: string;
  href?: string;
  category: SpeakingIdeaMapLeafCategory;
};

type BranchSection = {
  id: string;
  label: string;
  shortHint?: string;
  accentColor: string;
  leafCategory: SpeakingIdeaMapLeafCategory;
  leaves: BranchLeaf[];
  branchPosition: { x: number; y: number };
  leafOrigin: { x: number; y: number };
  leafGapY: number;
};

const OVERVIEW_NODE_DIMENSIONS = {
  small: { width: 220, height: 112 },
  medium: { width: 248, height: 122 },
  large: { width: 280, height: 132 },
} as const;

const ROOT_DIMENSIONS = {
  small: { width: 300, height: 128 },
  medium: { width: 344, height: 144 },
  large: { width: 392, height: 162 },
} as const;

const BRANCH_DIMENSIONS = { width: 168, height: 58 } as const;
const LEAF_DIMENSIONS = { width: 270, height: 78 } as const;

const BRANCH_LAYOUT = [
  {
    key: "simple",
    label: "Simple version",
    shortHint: "core phrases",
    accentColor: "#0f766e",
    leafCategory: "simple" as const,
    branchPosition: { x: -360, y: -230 },
    leafOrigin: { x: -720, y: -260 },
    leafGapY: 92,
  },
  {
    key: "band",
    label: "Band upgrade",
    shortHint: "stronger wording",
    accentColor: "#0f766e",
    leafCategory: "band" as const,
    branchPosition: { x: -360, y: 150 },
    leafOrigin: { x: -720, y: 120 },
    leafGapY: 92,
  },
  {
    key: "support",
    label: "Supporting logic",
    shortHint: "reasoning chain",
    accentColor: "#7c3aed",
    leafCategory: "support" as const,
    branchPosition: { x: 0, y: -330 },
    leafOrigin: { x: -140, y: -560 },
    leafGapY: 88,
  },
  {
    key: "pattern",
    label: "Answer pattern",
    shortHint: "reusable frame",
    accentColor: "#be185d",
    leafCategory: "pattern" as const,
    branchPosition: { x: -70, y: 330 },
    leafOrigin: { x: -340, y: 420 },
    leafGapY: 88,
  },
  {
    key: "chunk",
    label: "Useful chunks",
    shortHint: "memorize these",
    accentColor: "#1d4ed8",
    leafCategory: "chunk" as const,
    branchPosition: { x: 390, y: -250 },
    leafOrigin: { x: 590, y: -300 },
    leafGapY: 88,
  },
  {
    key: "question",
    label: "Applicable questions",
    shortHint: "where to use it",
    accentColor: "#b45309",
    leafCategory: "question" as const,
    branchPosition: { x: 440, y: 20 },
    leafOrigin: { x: 670, y: -30 },
    leafGapY: 92,
  },
  {
    key: "sample",
    label: "Sample answers",
    shortHint: "use in speech",
    accentColor: "#2563eb",
    leafCategory: "sample" as const,
    branchPosition: { x: 360, y: 310 },
    leafOrigin: { x: 610, y: 260 },
    leafGapY: 92,
  },
] as const;

function normalizeFilterValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength = 92) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function sentenceCase(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return normalized;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function splitIntoMemorableBits(value: string) {
  return normalizeWhitespace(value)
    .split(/[.;]|,| - | \| /g)
    .map((part) => sentenceCase(part))
    .filter((part) => part.length >= 8 && part.length <= 120);
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

function getAccentColor(kind: SpeakingIdeaMapNodeKind, category?: SpeakingIdeaMapLeafCategory) {
  if (kind === "root") {
    return "#1e293b";
  }

  if (kind === "branch") {
    switch (category) {
      case "simple":
      case "band":
        return "#0f766e";
      case "support":
      case "memorize":
        return "#7c3aed";
      case "pattern":
        return "#be185d";
      case "chunk":
        return "#1d4ed8";
      case "question":
        return "#b45309";
      case "sample":
        return "#2563eb";
      case "cta":
        return "#475569";
      default:
        return "#475569";
    }
  }

  if (kind === "leaf") {
    return getAccentColor("branch", category);
  }

  return "#1d4ed8";
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))];
}

function dedupeLeaves(leaves: BranchLeaf[]) {
  const seen = new Set<string>();

  return leaves.filter((leaf) => {
    const key = normalizeFilterValue(`${leaf.label} ${leaf.secondaryLabel ?? ""}`);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function withLimit(leaves: BranchLeaf[], limit: number) {
  return dedupeLeaves(leaves).slice(0, limit);
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
    ...idea.variants.map((variant) => variant.phrase),
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
  const radiusBase = 320;

  return ideas.map((idea, index) => {
    const nodeSize = getNodeSize(getNodeWeight(idea));
    const dimensions = OVERVIEW_NODE_DIMENSIONS[nodeSize];
    const ring = Math.floor(index / 8);
    const radius = radiusBase + ring * 220;
    const angle = ((index % 8) / 8) * Math.PI * 2 - Math.PI / 2;
    const x = Math.round(Math.cos(angle) * radius);
    const y = Math.round(Math.sin(angle) * radius);
    const topics = uniqueStrings(
      idea.questionMaps.map((questionMap) => questionMap.speakingQuestion.topic),
    )
      .slice(0, 2)
      .join(" • ");

    return {
      id: idea.id,
      kind: "idea" as const,
      label: idea.title,
      secondaryLabel: idea.shortLabel,
      body: undefined,
      href: `/admin/ideas/${idea.id}`,
      tooltip: `${idea.descriptionVi}\n\nLinked questions: ${idea.questionMaps.length}`,
      nodeSize,
      width: dimensions.width,
      height: dimensions.height,
      position: {
        x,
        y,
      },
      accentColor: getAccentColor("idea"),
      meta: {
        reuse: `${idea.reuseScore}/5 reuse`,
        popularity: `${idea.popularityScore}/5 popularity`,
        questions: `${idea.questionMaps.length} question(s)`,
        topics,
      },
    } satisfies SpeakingIdeaMapGraphNode;
  });
}

function buildCallToActionLeaf(
  idea: SpeakingIdeaRecord,
  label: string,
  category: SpeakingIdeaMapLeafCategory = "cta",
): BranchLeaf {
  return {
    id: `${idea.id}-${label.toLowerCase().replace(/\s+/g, "-")}`,
    label,
    secondaryLabel: "Open idea detail",
    tooltip: "Fill in this branch from the idea editor or AI helpers.",
    href: `/admin/ideas/${idea.id}`,
    category,
  };
}

function buildSimpleLeaves(idea: SpeakingIdeaRecord) {
  const variants = [...idea.variants].sort((left, right) => left.bandLevel - right.bandLevel);
  const leaves = variants.map((variant) => ({
    id: variant.id,
    label: truncate(variant.phrase, 64),
    secondaryLabel: `Band ${variant.bandLevel}`,
    tooltip: variant.exampleSentence,
    category: "simple" as const,
  }));

  return leaves.length > 0
    ? withLimit(leaves, 5)
    : [buildCallToActionLeaf(idea, "Add simple variants", "simple")];
}

function buildBandUpgradeLeaves(idea: SpeakingIdeaRecord) {
  const variants = [...idea.variants].sort((left, right) => right.bandLevel - left.bandLevel);
  const leaves = variants.map((variant) => ({
    id: `${variant.id}-upgrade`,
    label: truncate(variant.phrase, 72),
    secondaryLabel: `Band ${variant.bandLevel}`,
    tooltip: variant.exampleSentence,
    category: "band" as const,
  }));

  return leaves.length > 0
    ? withLimit(leaves, 5)
    : [buildCallToActionLeaf(idea, "Add band upgrades", "band")];
}

function buildSupportLeaves(idea: SpeakingIdeaRecord) {
  const leaves = idea.supports.flatMap((support) => {
    const base = splitIntoMemorableBits(support.text).map((bit, index) => ({
      id: `${support.id}-text-${index}`,
      label: truncate(bit, 90),
      secondaryLabel: support.supportType.replaceAll("_", " "),
      tooltip: support.example ?? support.text,
      category: "support" as const,
    }));

    const example = support.example
      ? splitIntoMemorableBits(support.example).slice(0, 1).map((bit, index) => ({
          id: `${support.id}-example-${index}`,
          label: truncate(bit, 90),
          secondaryLabel: "Example",
          tooltip: support.example ?? support.text,
          category: "support" as const,
        }))
      : [];

    return [...base, ...example];
  });

  return leaves.length > 0
    ? withLimit(leaves, 6)
    : [buildCallToActionLeaf(idea, "Add support logic", "support")];
}

function buildPatternLeaves(idea: SpeakingIdeaRecord) {
  const leaves = idea.patterns.flatMap((pattern) => [
    {
      id: `${pattern.id}-pattern`,
      label: truncate(pattern.patternText, 98),
      secondaryLabel: "Pattern",
      tooltip: pattern.exampleAnswer,
      category: "pattern" as const,
    },
    {
      id: `${pattern.id}-example`,
      label: truncate(pattern.exampleAnswer, 104),
      secondaryLabel: "Example use",
      tooltip: pattern.exampleAnswer,
      category: "pattern" as const,
    },
  ]);

  return leaves.length > 0
    ? withLimit(leaves, 6)
    : [buildCallToActionLeaf(idea, "Add answer patterns", "pattern")];
}

function buildUsefulChunkLeaves(idea: SpeakingIdeaRecord) {
  const rawPhrases = [
    ...idea.variants.map((variant) => variant.phrase),
    ...idea.patterns.flatMap((pattern) => splitIntoMemorableBits(pattern.patternText)),
    ...idea.supports.flatMap((support) => splitIntoMemorableBits(support.text)),
  ];

  const leaves = uniqueStrings(rawPhrases)
    .filter((phrase) => phrase.length <= 64)
    .map((phrase, index) => ({
      id: `${idea.id}-chunk-${index}`,
      label: truncate(phrase, 64),
      tooltip: phrase,
      category: "chunk" as const,
    }));

  return leaves.length > 0
    ? withLimit(leaves, 6)
    : [buildCallToActionLeaf(idea, "Add useful chunks", "chunk")];
}

function buildQuestionLeaves(idea: SpeakingIdeaRecord) {
  const leaves = idea.questionMaps.map((questionMap) => ({
    id: questionMap.id,
    label: truncate(questionMap.speakingQuestion.prompt, 104),
    secondaryLabel: `${questionMap.speakingQuestion.taskType.replace("_", " ")} · ${questionMap.speakingQuestion.topic}`,
    tooltip: questionMap.aiReason ?? questionMap.speakingQuestion.prompt,
    href: `/admin/questions?questionId=${questionMap.speakingQuestion.id}`,
    category: "question" as const,
  }));

  return leaves.length > 0
    ? withLimit(leaves, 5)
    : [buildCallToActionLeaf(idea, "Map idea to questions", "question")];
}

function buildSampleLeaves(idea: SpeakingIdeaRecord) {
  const leaves = idea.patterns.map((pattern) => ({
    id: `${pattern.id}-sample`,
    label: truncate(pattern.exampleAnswer, 108),
    secondaryLabel: "Sample answer line",
    tooltip: pattern.exampleAnswer,
    category: "sample" as const,
  }));

  return leaves.length > 0
    ? withLimit(leaves, 3)
    : [buildCallToActionLeaf(idea, "Generate sample answers", "sample")];
}

function buildMemorizeLeaves(idea: SpeakingIdeaRecord) {
  const mainIdea =
    buildSimpleLeaves(idea)[0]?.label ?? truncate(idea.shortLabel || idea.title, 72);
  const support = buildSupportLeaves(idea)[0]?.label ?? "Add one strong support point";
  const resultCandidate =
    idea.supports.find((supportItem) => supportItem.supportType === "RESULT")?.text ??
    idea.patterns[0]?.exampleAnswer ??
    "";
  const result = resultCandidate
    ? truncate(splitIntoMemorableBits(resultCandidate)[0] ?? resultCandidate, 96)
    : "Add a result line";

  return [
    {
      id: `${idea.id}-memorize-main`,
      label: `1. Main idea: ${mainIdea}`,
      secondaryLabel: undefined,
      tooltip: idea.descriptionEn,
      href: undefined,
      category: "memorize" as const,
    },
    {
      id: `${idea.id}-memorize-support`,
      label: `2. Support: ${support}`,
      secondaryLabel: undefined,
      tooltip: idea.descriptionVi,
      href: undefined,
      category: "memorize" as const,
    },
    {
      id: `${idea.id}-memorize-result`,
      label: `3. Result: ${result}`,
      secondaryLabel: undefined,
      tooltip: resultCandidate || idea.descriptionEn,
      href: undefined,
      category: "memorize" as const,
    },
  ] satisfies BranchLeaf[];
}

function buildFocusBranches(idea: SpeakingIdeaRecord, memorizeView: boolean) {
  const memorizeLeaves = buildMemorizeLeaves(idea);

  if (memorizeView) {
    return [
      {
        id: `${idea.id}-branch-main`,
        ...BRANCH_LAYOUT[0],
        label: "Main idea",
        shortHint: "step 1",
        leafCategory: "memorize" as const,
        accentColor: "#0f766e",
        leaves: [memorizeLeaves[0]],
      },
      {
        id: `${idea.id}-branch-support`,
        ...BRANCH_LAYOUT[2],
        label: "Support",
        shortHint: "step 2",
        leafCategory: "memorize" as const,
        accentColor: "#7c3aed",
        leaves: [memorizeLeaves[1]],
      },
      {
        id: `${idea.id}-branch-result`,
        ...BRANCH_LAYOUT[5],
        label: "Result",
        shortHint: "step 3",
        leafCategory: "memorize" as const,
        accentColor: "#2563eb",
        leaves: [memorizeLeaves[2]],
      },
    ] satisfies BranchSection[];
  }

  return [
    {
      id: `${idea.id}-branch-simple`,
      ...BRANCH_LAYOUT[0],
      leaves: buildSimpleLeaves(idea),
    },
    {
      id: `${idea.id}-branch-band`,
      ...BRANCH_LAYOUT[1],
      leaves: buildBandUpgradeLeaves(idea),
    },
    {
      id: `${idea.id}-branch-support`,
      ...BRANCH_LAYOUT[2],
      leaves: buildSupportLeaves(idea),
    },
    {
      id: `${idea.id}-branch-pattern`,
      ...BRANCH_LAYOUT[3],
      leaves: buildPatternLeaves(idea),
    },
    {
      id: `${idea.id}-branch-chunk`,
      ...BRANCH_LAYOUT[4],
      leaves: buildUsefulChunkLeaves(idea),
    },
    {
      id: `${idea.id}-branch-question`,
      ...BRANCH_LAYOUT[5],
      leaves: buildQuestionLeaves(idea),
    },
    {
      id: `${idea.id}-branch-sample`,
      ...BRANCH_LAYOUT[6],
      leaves: buildSampleLeaves(idea),
    },
  ] satisfies BranchSection[];
}

function buildBranchHeaderNode(branch: BranchSection): SpeakingIdeaMapGraphNode {
  return {
    id: branch.id,
    kind: "branch",
    label: branch.label,
    secondaryLabel: branch.shortHint,
    nodeSize: "medium",
    width: BRANCH_DIMENSIONS.width,
    height: BRANCH_DIMENSIONS.height,
    position: branch.branchPosition,
    accentColor: branch.accentColor,
    category: branch.leafCategory,
  };
}

function buildFocusScene(idea: SpeakingIdeaRecord, memorizeView: boolean) {
  const rootSize = getNodeSize(getNodeWeight(idea));
  const rootDimensions = ROOT_DIMENSIONS[rootSize];
  const rootBody = memorizeView
    ? truncate(idea.descriptionVi || idea.descriptionEn || idea.title, 92)
    : truncate(idea.descriptionVi || idea.descriptionEn, 120);

  const nodes: SpeakingIdeaMapGraphNode[] = [
    {
      id: idea.id,
      kind: "root",
      label: idea.title,
      secondaryLabel: idea.shortLabel,
      body: rootBody,
      href: `/admin/ideas/${idea.id}`,
      tooltip: `${idea.descriptionVi}\n\n${idea.descriptionEn}`,
      nodeSize: rootSize,
      width: rootDimensions.width,
      height: rootDimensions.height,
      position: { x: 0, y: 0 },
      accentColor: getAccentColor("root"),
      meta: memorizeView
        ? undefined
        : {
            reuse: `${idea.reuseScore}/5 reuse`,
            popularity: `${idea.popularityScore}/5 popularity`,
            linked: `${idea.questionMaps.length} question(s)`,
          },
    },
  ];

  const edges: SpeakingIdeaMapGraphEdge[] = [];
  const branches = buildFocusBranches(idea, memorizeView);

  for (const branch of branches) {
    nodes.push(buildBranchHeaderNode(branch));
    edges.push({
      id: `${idea.id}->${branch.id}`,
      source: idea.id,
      target: branch.id,
    });

    branch.leaves.forEach((leaf, index) => {
      const nodeId = `${branch.id}-${leaf.id}`;

      nodes.push({
        id: nodeId,
        kind: "leaf",
        label: leaf.label,
        secondaryLabel: leaf.secondaryLabel,
        href: leaf.href,
        tooltip: leaf.tooltip ?? leaf.label,
        nodeSize: "small",
        width: LEAF_DIMENSIONS.width,
        height: LEAF_DIMENSIONS.height,
        position: {
          x: branch.leafOrigin.x,
          y: branch.leafOrigin.y + index * branch.leafGapY,
        },
        accentColor: getAccentColor("leaf", leaf.category),
        category: leaf.category,
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
  memorizeView = false,
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

    const focusScene = buildFocusScene(selectedIdea, memorizeView);
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
