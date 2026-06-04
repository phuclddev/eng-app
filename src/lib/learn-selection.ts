import type { ChunkRecord } from "@/lib/types";

type LearnSelectionOptions = {
  maxItems?: number;
  now?: Date;
};

function compareDates(left?: string, right?: string) {
  return new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();
}

function sortUnseenChunks(left: ChunkRecord, right: ChunkRecord) {
  return (
    left.difficulty - right.difficulty ||
    left.bandLevel - right.bandLevel ||
    compareDates(left.createdAt, right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

function sortWeakChunks(left: ChunkRecord, right: ChunkRecord) {
  return (
    (left.review?.masteryScore ?? 0) - (right.review?.masteryScore ?? 0) ||
    compareDates(left.review?.nextReviewAt, right.review?.nextReviewAt) ||
    (right.review?.reviewCount ?? 0) - (left.review?.reviewCount ?? 0) ||
    left.difficulty - right.difficulty ||
    left.id.localeCompare(right.id)
  );
}

function sortReinforcementChunks(left: ChunkRecord, right: ChunkRecord) {
  return (
    compareDates(left.review?.nextReviewAt, right.review?.nextReviewAt) ||
    (left.review?.masteryScore ?? 0) - (right.review?.masteryScore ?? 0) ||
    (left.review?.reviewCount ?? 0) - (right.review?.reviewCount ?? 0) ||
    left.id.localeCompare(right.id)
  );
}

function sortMasteredChunks(left: ChunkRecord, right: ChunkRecord) {
  return (
    compareDates(right.review?.nextReviewAt, left.review?.nextReviewAt) ||
    (right.review?.masteryScore ?? 0) - (left.review?.masteryScore ?? 0) ||
    right.bandLevel - left.bandLevel ||
    left.id.localeCompare(right.id)
  );
}

function isUnseenChunk(chunk: ChunkRecord) {
  return !chunk.review;
}

function isMasteredChunk(chunk: ChunkRecord, now: Date) {
  if (!chunk.review) {
    return false;
  }

  return (
    chunk.review.masteryScore >= 85 &&
    chunk.review.reviewCount >= 3 &&
    chunk.review.intervalDays >= 14 &&
    new Date(chunk.review.nextReviewAt) > now
  );
}

function isWeakChunk(chunk: ChunkRecord, now: Date) {
  if (!chunk.review) {
    return false;
  }

  const nextReviewAt = new Date(chunk.review.nextReviewAt);

  return (
    chunk.review.masteryScore < 60 ||
    (nextReviewAt <= now && chunk.review.masteryScore < 80)
  );
}

function pushUniqueChunks(
  selected: ChunkRecord[],
  candidates: ChunkRecord[],
  targetSize: number,
) {
  const seen = new Set(selected.map((chunk) => chunk.id));

  for (const candidate of candidates) {
    if (selected.length >= targetSize) {
      break;
    }

    if (seen.has(candidate.id)) {
      continue;
    }

    selected.push(candidate);
    seen.add(candidate.id);
  }
}

export function selectLearnChunks(
  chunks: ChunkRecord[],
  options: LearnSelectionOptions = {},
) {
  const maxItems = options.maxItems ?? 10;
  const now = options.now ?? new Date();

  const unseen = chunks.filter(isUnseenChunk).sort(sortUnseenChunks);
  const weak = chunks
    .filter((chunk) => isWeakChunk(chunk, now))
    .sort(sortWeakChunks);
  const mastered = chunks
    .filter((chunk) => isMasteredChunk(chunk, now))
    .sort(sortMasteredChunks);
  const reinforcement = chunks
    .filter(
      (chunk) =>
        !isUnseenChunk(chunk) &&
        !isWeakChunk(chunk, now) &&
        !isMasteredChunk(chunk, now),
    )
    .sort(sortReinforcementChunks);

  const selected: ChunkRecord[] = [];
  const unseenQuota = Math.min(maxItems, Math.max(4, Math.ceil(maxItems * 0.5)));
  const weakQuota = Math.min(
    maxItems - Math.min(unseen.length, unseenQuota),
    weak.length > 0 ? 2 : 0,
  );

  pushUniqueChunks(selected, unseen, unseenQuota);
  pushUniqueChunks(selected, weak, selected.length + weakQuota);
  pushUniqueChunks(selected, unseen, maxItems);
  pushUniqueChunks(selected, reinforcement, maxItems);
  pushUniqueChunks(selected, weak, maxItems);
  pushUniqueChunks(selected, mastered, maxItems);

  return selected;
}
