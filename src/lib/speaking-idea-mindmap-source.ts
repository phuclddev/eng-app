import type {
  SpeakingIdeaMindMapRecord,
  SpeakingIdeaMindMapSourceType,
  SpeakingIdeaRecord,
} from "@/lib/types";
import { normalizeText } from "@/lib/utils";

const MAX_BRANCH_ITEMS = 6;
const MAX_SAMPLE_ANSWERS = 3;

function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength = 88) {
  const normalized = cleanLine(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function uniqueLines(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawValue of values) {
    if (!rawValue) {
      continue;
    }

    const value = cleanLine(rawValue);
    const key = normalizeText(value);
    if (!value || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

function splitFragments(value: string) {
  return uniqueLines(
    value
      .split(/[.;]|,| - | \| /g)
      .map((part) => truncate(part, 82))
      .filter((part) => part.length >= 6),
  );
}

function indent(level: number, value: string) {
  return `${"  ".repeat(level)}${value}`;
}

function addBranch(lines: string[], label: string, items: string[]) {
  if (items.length === 0) {
    return;
  }

  lines.push(indent(2, label));
  items.slice(0, MAX_BRANCH_ITEMS).forEach((item) => {
    lines.push(indent(3, truncate(item, 110)));
  });
}

function addPlantumlBranch(lines: string[], label: string, items: string[]) {
  if (items.length === 0) {
    return;
  }

  lines.push(`** ${label}`);
  items.slice(0, MAX_BRANCH_ITEMS).forEach((item) => {
    lines.push(`*** ${truncate(item, 110)}`);
  });
}

function extractMermaidRootTitle(sourceText: string) {
  const match = sourceText.match(/root\(\((.+?)\)\)/);
  return match?.[1]?.trim() || null;
}

function extractPlantumlRootTitle(sourceText: string) {
  const match = sourceText.match(/^\*\s+(.+)$/m);
  return match?.[1]?.trim() || null;
}

export function formatSpeakingIdeaMindMapSource(sourceText: string) {
  return sourceText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .trim();
}

export function buildSpeakingIdeaMindMapExportBaseName(idea: {
  title: string;
  shortLabel: string;
}) {
  const slug = normalizeText(idea.shortLabel || idea.title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `speaking-idea-map-${slug || "idea"}`;
}

function buildIdeaBranchData(idea: SpeakingIdeaRecord) {
  const simpleVersions = uniqueLines(
    [...idea.variants]
      .sort((left, right) => left.bandLevel - right.bandLevel)
      .map((variant) => variant.phrase),
  );

  const bandUpgrades = uniqueLines(
    [...idea.variants]
      .sort((left, right) => right.bandLevel - left.bandLevel)
      .map((variant) => variant.phrase),
  );

  const supports = uniqueLines(
    idea.supports.flatMap((support) => [
      ...splitFragments(support.text),
      ...(support.example ? splitFragments(support.example).slice(0, 1) : []),
    ]),
  );

  const patterns = uniqueLines(
    idea.patterns.flatMap((pattern) => [
      truncate(pattern.patternText, 110),
      truncate(pattern.exampleAnswer, 110),
    ]),
  );

  const chunks = uniqueLines([
    ...idea.variants.map((variant) => truncate(variant.phrase, 72)),
    ...idea.patterns.flatMap((pattern) => splitFragments(pattern.patternText)),
    ...idea.supports.flatMap((support) => splitFragments(support.text)),
  ]).filter((line) => line.length <= 72);

  const questions = uniqueLines(
    idea.questionMaps.map((questionMap) => truncate(questionMap.speakingQuestion.prompt, 110)),
  );

  const samples = uniqueLines(
    idea.patterns.map((pattern) => truncate(pattern.exampleAnswer, 118)),
  ).slice(0, MAX_SAMPLE_ANSWERS);

  return {
    simpleVersions,
    bandUpgrades,
    supports,
    patterns,
    chunks,
    questions,
    samples,
  };
}

export function generateMermaidSpeakingIdeaMindMapSource(idea: SpeakingIdeaRecord) {
  const { simpleVersions, bandUpgrades, supports, patterns, chunks, questions, samples } =
    buildIdeaBranchData(idea);

  const lines = [
    "mindmap",
    indent(1, `root((${cleanLine(idea.title)}))`),
  ];

  if (idea.descriptionVi) {
    lines.push(indent(2, truncate(idea.descriptionVi, 100)));
  }

  addBranch(lines, "Simple version", simpleVersions);
  addBranch(lines, "Band upgrade", bandUpgrades);
  addBranch(lines, "Supporting logic", supports);
  addBranch(lines, "Reusable answer pattern", patterns);
  addBranch(lines, "Useful chunks", chunks);
  addBranch(lines, "Applicable questions", questions);
  addBranch(lines, "Sample answers", samples);

  return formatSpeakingIdeaMindMapSource(lines.join("\n"));
}

export function generatePlantumlSpeakingIdeaMindMapSource(idea: SpeakingIdeaRecord) {
  const { simpleVersions, bandUpgrades, supports, patterns, chunks, questions, samples } =
    buildIdeaBranchData(idea);

  const lines = ["@startmindmap", `* ${cleanLine(idea.title)}`];

  if (idea.descriptionVi) {
    lines.push(`** ${truncate(idea.descriptionVi, 100)}`);
  }

  addPlantumlBranch(lines, "Simple version", simpleVersions);
  addPlantumlBranch(lines, "Band upgrade", bandUpgrades);
  addPlantumlBranch(lines, "Supporting logic", supports);
  addPlantumlBranch(lines, "Reusable answer pattern", patterns);
  addPlantumlBranch(lines, "Useful chunks", chunks);
  addPlantumlBranch(lines, "Applicable questions", questions);
  addPlantumlBranch(lines, "Sample answers", samples);
  lines.push("@endmindmap");

  return formatSpeakingIdeaMindMapSource(lines.join("\n"));
}

export function generateSpeakingIdeaMindMapSource(
  idea: SpeakingIdeaRecord,
  sourceType: SpeakingIdeaMindMapSourceType = "MERMAID",
) {
  return sourceType === "PLANTUML"
    ? generatePlantumlSpeakingIdeaMindMapSource(idea)
    : generateMermaidSpeakingIdeaMindMapSource(idea);
}

export function getSpeakingIdeaMindMapRecord(
  idea: SpeakingIdeaRecord,
): SpeakingIdeaMindMapRecord {
  const generatedSource = generateSpeakingIdeaMindMapSource(
    idea,
    idea.mindMapSourceType,
  );
  const sourceText = idea.mindMapSourceText
    ? formatSpeakingIdeaMindMapSource(idea.mindMapSourceText)
    : generatedSource;

  return {
    ideaId: idea.id,
    sourceType: idea.mindMapSourceType,
    sourceText,
    renderedTitle:
      idea.mindMapRenderedTitle ??
      (idea.mindMapSourceType === "PLANTUML"
        ? extractPlantumlRootTitle(sourceText)
        : extractMermaidRootTitle(sourceText)) ??
      idea.shortLabel ??
      idea.title,
    updatedAt: idea.updatedAt ?? null,
  };
}
