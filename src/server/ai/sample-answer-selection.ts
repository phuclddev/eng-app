import type { QuestionChunkUsageRole } from "@/lib/types";
import { slugify } from "@/lib/utils";

export type SampleAnswerChunkCandidate = {
  id: string;
  chunk: string;
  meaningVi: string;
  topic: string | null;
  bandLevel: number;
  usageRole: QuestionChunkUsageRole | null;
  example: string | null;
  source: "GENERAL" | "RECOMMENDED" | "TOPIC";
  sortOrder?: number;
};

const GENERAL_TOPIC_SLUGS = new Set([
  "general",
  "daily-life",
  "everyday-life",
  "common-topics",
  "ielts-speaking",
]);

const USAGE_ROLE_PRIORITY: Record<QuestionChunkUsageRole, number> = {
  HOOK: 0,
  OPENING: 0,
  MAIN_IDEA: 1,
  REASON: 1,
  SUPPORTING_DETAIL: 2,
  DETAIL: 2,
  EXAMPLE: 3,
  STORYTELLING: 3,
  OPINION: 4,
  SPECULATION: 4,
  COMPARISON: 5,
  CONTRAST: 5,
  EMOTION: 6,
  FILLER: 7,
  CLOSING: 8,
  ENDING: 8,
};

function normalizeText(value?: null | string) {
  return value?.trim().toLowerCase().normalize("NFKC") ?? "";
}

function isTopicRelated(questionTopics: string[], chunkTopic: null | string) {
  if (!chunkTopic) {
    return false;
  }

  const normalizedChunkTopic = normalizeText(chunkTopic);

  return questionTopics.some((topic) => {
    if (!topic) {
      return false;
    }

    return (
      normalizedChunkTopic === topic ||
      normalizedChunkTopic.includes(topic) ||
      topic.includes(normalizedChunkTopic)
    );
  });
}

function isHighValueGeneralChunk(
  chunk: SampleAnswerChunkCandidate,
  targetBand: number,
) {
  const topicSlug = chunk.topic ? slugify(chunk.topic) : "";
  const bandDistance = Math.abs(chunk.bandLevel - targetBand);

  return (
    !chunk.topic ||
    GENERAL_TOPIC_SLUGS.has(topicSlug) ||
    (bandDistance <= 1.5 && Boolean(chunk.example))
  );
}

function scoreTopicChunk(
  chunk: SampleAnswerChunkCandidate,
  targetBand: number,
  questionTopics: string[],
) {
  const bandDistance = Math.abs(chunk.bandLevel - targetBand);
  const relatedBoost = isTopicRelated(questionTopics, chunk.topic) ? 100 : 0;
  const exampleBoost = chunk.example ? 20 : 0;

  return relatedBoost + exampleBoost - bandDistance * 10;
}

function scoreGeneralChunk(
  chunk: SampleAnswerChunkCandidate,
  targetBand: number,
  questionTopics: string[],
) {
  const topicBoost = isTopicRelated(questionTopics, chunk.topic) ? 80 : 0;
  const exampleBoost = chunk.example ? 25 : 0;
  const bandDistance = Math.abs(chunk.bandLevel - targetBand);
  const generalBoost = isHighValueGeneralChunk(chunk, targetBand) ? 40 : 0;

  return generalBoost + topicBoost + exampleBoost - bandDistance * 12;
}

function dedupeCandidates(candidates: SampleAnswerChunkCandidate[]) {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) {
      return false;
    }

    seen.add(candidate.id);
    return true;
  });
}

export function selectSampleAnswerChunks(input: {
  generalChunks: SampleAnswerChunkCandidate[];
  maxChunks: number;
  recommendedChunks: SampleAnswerChunkCandidate[];
  sameTopicChunks: SampleAnswerChunkCandidate[];
  subTopic?: null | string;
  targetBand: number;
  topic: string;
}) {
  const questionTopics = [input.topic, input.subTopic]
    .map(normalizeText)
    .filter(Boolean);
  const selected: SampleAnswerChunkCandidate[] = [];
  const seen = new Set<string>();

  const addChunks = (candidates: SampleAnswerChunkCandidate[]) => {
    for (const candidate of candidates) {
      if (selected.length >= input.maxChunks) {
        break;
      }

      if (seen.has(candidate.id)) {
        continue;
      }

      seen.add(candidate.id);
      selected.push(candidate);
    }
  };

  const recommended = dedupeCandidates(input.recommendedChunks).sort((left, right) => {
    const leftRolePriority = left.usageRole ? USAGE_ROLE_PRIORITY[left.usageRole] : 99;
    const rightRolePriority = right.usageRole ? USAGE_ROLE_PRIORITY[right.usageRole] : 99;

    if (leftRolePriority !== rightRolePriority) {
      return leftRolePriority - rightRolePriority;
    }

    if ((left.sortOrder ?? 0) !== (right.sortOrder ?? 0)) {
      return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    }

    return left.chunk.localeCompare(right.chunk);
  });

  const sameTopic = dedupeCandidates(input.sameTopicChunks).sort(
    (left, right) =>
      scoreTopicChunk(right, input.targetBand, questionTopics) -
      scoreTopicChunk(left, input.targetBand, questionTopics),
  );

  const general = dedupeCandidates(input.generalChunks)
    .filter((candidate) => isHighValueGeneralChunk(candidate, input.targetBand))
    .sort(
      (left, right) =>
        scoreGeneralChunk(right, input.targetBand, questionTopics) -
        scoreGeneralChunk(left, input.targetBand, questionTopics),
    );

  addChunks(recommended);
  addChunks(sameTopic);
  addChunks(general);

  return selected;
}
