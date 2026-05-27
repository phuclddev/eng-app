import type { PracticeDeck, PracticeMode } from "@/lib/types";
import { buildPracticeDeck } from "@/lib/practice";
import { getChunkLibrary } from "@/server/data/chunks";

export async function getPracticeDeckForMode(
  userId: string,
  mode: PracticeMode,
): Promise<PracticeDeck> {
  const chunks = await getChunkLibrary(userId);
  const now = new Date();
  const dueChunks = chunks.filter((chunk) =>
    chunk.review ? new Date(chunk.review.nextReviewAt) <= now : false,
  );

  let pool = chunks;

  if (mode === "REVIEW") {
    pool = dueChunks;
  }

  if (mode === "LEARN") {
    pool = chunks.slice(0, 12);
  }

  if (mode === "MIXED") {
    const merged = [...dueChunks, ...chunks];
    const seen = new Set<string>();
    pool = merged.filter((chunk) => {
      if (seen.has(chunk.id)) {
        return false;
      }

      seen.add(chunk.id);
      return true;
    });
  }

  return {
    mode,
    exercises: buildPracticeDeck(pool, mode, 10),
    totalDue: dueChunks.length,
    totalChunks: chunks.length,
  };
}
