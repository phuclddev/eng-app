import type {
  FamilyChunkRecord,
  FamilyPracticeAnswerPayload,
  FamilyPracticeExercise,
  FamilyPracticeExerciseType,
  FamilyPracticeMode,
  FamilyReviewSnapshot,
} from "@/lib/types";
import { normalizeText } from "@/lib/utils";

export type FamilyPracticeChunkRecord = FamilyChunkRecord & {
  review: FamilyReviewSnapshot | null;
};

type StagePlan = {
  exerciseType: FamilyPracticeExerciseType;
  stageRank: number;
};

const SPEAKER_LABELS: Record<FamilyChunkRecord["speakerRole"], string> = {
  FATHER: "Dad",
  MOTHER: "Mom",
  CHILD: "Kiwi",
  GRANDPARENT: "Grandparent",
  GENERAL: "Speaker",
};

function stableHash(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function speakerLabel(role: FamilyChunkRecord["speakerRole"]) {
  return SPEAKER_LABELS[role] ?? "Speaker";
}

export function inferFamilyChunkStagePlan(
  chunk: FamilyPracticeChunkRecord,
): StagePlan {
  const review = chunk.review;

  if (!review || review.reviewCount === 0) {
    return {
      exerciseType: "FAMILY_CHUNK_RECALL",
      stageRank: 0,
    };
  }

  if (review.masteryScore < 35) {
    return {
      exerciseType: "FILL_IN_DIALOG",
      stageRank: 1,
    };
  }

  if (review.masteryScore < 65) {
    return {
      exerciseType: "VI_TO_CHUNK",
      stageRank: 2,
    };
  }

  if (review.masteryScore < 85) {
    return {
      exerciseType: "NATURAL_RESPONSE",
      stageRank: 3,
    };
  }

  return {
    exerciseType: "CONTINUE_CONVERSATION",
    stageRank: 4,
  };
}

export function calculateFamilyChunkPriority(input: {
  chunk: FamilyPracticeChunkRecord;
  mode: FamilyPracticeMode;
  now: Date;
}): number {
  const { chunk, mode, now } = input;
  const review = chunk.review;
  let score = 0;

  if (review) {
    const due = new Date(review.nextReviewAt).getTime() <= now.getTime();

    if (due) {
      score += 100;
    }

    if (review.masteryScore < 40) {
      score += 25;
    }
  } else {
    score += 12;
  }

  score += chunk.personalizationScore * 8;
  score += chunk.frequencyScore * 4;

  if (mode === "REVIEW" && !review) {
    score -= 60;
  }

  if (mode === "DAILY" && review && review.masteryScore >= 90) {
    score -= 30;
  }

  return score;
}

function createFillInDialog(
  chunk: FamilyPracticeChunkRecord,
): FamilyPracticeExercise {
  const example = chunk.exampleSentence ?? chunk.usageContext;
  const hiddenSentence = example.replace(
    new RegExp(chunk.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    "_____",
  );
  const speaker = speakerLabel(chunk.speakerRole);

  return {
    id: `${chunk.id}-fill`,
    familyChunkId: chunk.id,
    type: "FILL_IN_DIALOG",
    prompt:
      hiddenSentence === example
        ? `${speaker}: complete the line that means "${chunk.meaningVi}" — _____.`
        : `${speaker}: "${hiddenSentence}"`,
    expectedAnswer: chunk.text,
    hint: chunk.meaningVi,
    chunk: chunk.text,
    meaningVi: chunk.meaningVi,
    usageContext: chunk.usageContext,
    exampleSentence: chunk.exampleSentence,
    speakerRole: chunk.speakerRole,
    childFocus: chunk.childFocus,
    scenarioCategory: chunk.scenarioCategory,
  };
}

function createViToChunk(
  chunk: FamilyPracticeChunkRecord,
): FamilyPracticeExercise {
  return {
    id: `${chunk.id}-vi`,
    familyChunkId: chunk.id,
    type: "VI_TO_CHUNK",
    prompt: `Type the family chunk for: ${chunk.meaningVi}`,
    expectedAnswer: chunk.text,
    hint: chunk.usageContext,
    chunk: chunk.text,
    meaningVi: chunk.meaningVi,
    usageContext: chunk.usageContext,
    exampleSentence: chunk.exampleSentence,
    speakerRole: chunk.speakerRole,
    childFocus: chunk.childFocus,
    scenarioCategory: chunk.scenarioCategory,
  };
}

function createFamilyChunkRecall(
  chunk: FamilyPracticeChunkRecord,
): FamilyPracticeExercise {
  return {
    id: `${chunk.id}-recall`,
    familyChunkId: chunk.id,
    type: "FAMILY_CHUNK_RECALL",
    prompt: `${chunk.usageContext} — type the natural chunk that means "${chunk.meaningVi}".`,
    expectedAnswer: chunk.text,
    hint: chunk.exampleSentence ?? chunk.meaningVi,
    chunk: chunk.text,
    meaningVi: chunk.meaningVi,
    usageContext: chunk.usageContext,
    exampleSentence: chunk.exampleSentence,
    speakerRole: chunk.speakerRole,
    childFocus: chunk.childFocus,
    scenarioCategory: chunk.scenarioCategory,
  };
}

function createNaturalResponse(
  chunk: FamilyPracticeChunkRecord,
  pool: FamilyPracticeChunkRecord[],
): FamilyPracticeExercise {
  const speaker = speakerLabel(chunk.speakerRole);
  const distractors = pool
    .filter(
      (candidate) =>
        candidate.id !== chunk.id &&
        candidate.text.toLowerCase() !== chunk.text.toLowerCase(),
    )
    .sort(
      (left, right) =>
        Math.abs(left.difficulty - chunk.difficulty) -
        Math.abs(right.difficulty - chunk.difficulty),
    )
    .slice(0, 6);
  const seededDistractors = distractors
    .sort((left, right) => {
      const leftKey = stableHash(`${chunk.id}:mc:${left.id}`);
      const rightKey = stableHash(`${chunk.id}:mc:${right.id}`);
      return leftKey - rightKey || left.id.localeCompare(right.id);
    })
    .slice(0, 3)
    .map((candidate) => candidate.text);
  const options = [chunk.text, ...seededDistractors];
  const orderedOptions = options.sort((left, right) => {
    const leftKey = stableHash(`${chunk.id}:opt:${left}`);
    const rightKey = stableHash(`${chunk.id}:opt:${right}`);
    return leftKey - rightKey || left.localeCompare(right);
  });

  return {
    id: `${chunk.id}-natural`,
    familyChunkId: chunk.id,
    type: "NATURAL_RESPONSE",
    prompt: `${chunk.usageContext}\n\nWhich response is the most natural for ${speaker}?`,
    expectedAnswer: chunk.text,
    options: orderedOptions,
    hint: chunk.meaningVi,
    chunk: chunk.text,
    meaningVi: chunk.meaningVi,
    usageContext: chunk.usageContext,
    exampleSentence: chunk.exampleSentence,
    speakerRole: chunk.speakerRole,
    childFocus: chunk.childFocus,
    scenarioCategory: chunk.scenarioCategory,
  };
}

function createContinueConversation(
  chunk: FamilyPracticeChunkRecord,
): FamilyPracticeExercise {
  const speaker = speakerLabel(chunk.speakerRole);

  return {
    id: `${chunk.id}-continue`,
    familyChunkId: chunk.id,
    type: "CONTINUE_CONVERSATION",
    prompt: `${chunk.usageContext}\n\nContinue the conversation as ${speaker}. Your reply should naturally use "${chunk.text}".`,
    expectedAnswer: chunk.text,
    hint: chunk.meaningVi,
    chunk: chunk.text,
    meaningVi: chunk.meaningVi,
    usageContext: chunk.usageContext,
    exampleSentence: chunk.exampleSentence,
    speakerRole: chunk.speakerRole,
    childFocus: chunk.childFocus,
    scenarioCategory: chunk.scenarioCategory,
  };
}

function createExerciseForPlan(
  plan: StagePlan,
  chunk: FamilyPracticeChunkRecord,
  pool: FamilyPracticeChunkRecord[],
): FamilyPracticeExercise {
  switch (plan.exerciseType) {
    case "VI_TO_CHUNK":
      return createViToChunk(chunk);
    case "FILL_IN_DIALOG":
      return createFillInDialog(chunk);
    case "NATURAL_RESPONSE":
      return createNaturalResponse(chunk, pool);
    case "CONTINUE_CONVERSATION":
      return createContinueConversation(chunk);
    case "FAMILY_CHUNK_RECALL":
      return createFamilyChunkRecall(chunk);
  }
}

export function buildFamilyPracticeDeck(input: {
  chunks: FamilyPracticeChunkRecord[];
  mode: FamilyPracticeMode;
  maxItems?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const maxItems = input.maxItems ?? 8;
  const ranked = [...input.chunks]
    .map((chunk) => ({
      chunk,
      priority: calculateFamilyChunkPriority({
        chunk,
        mode: input.mode,
        now,
      }),
    }))
    .sort((left, right) => {
      const priorityDiff = right.priority - left.priority;
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftKey = stableHash(`${input.mode}:${left.chunk.id}`);
      const rightKey = stableHash(`${input.mode}:${right.chunk.id}`);
      return leftKey - rightKey || left.chunk.id.localeCompare(right.chunk.id);
    })
    .slice(0, maxItems);

  return ranked.map(({ chunk }) =>
    createExerciseForPlan(inferFamilyChunkStagePlan(chunk), chunk, input.chunks),
  );
}

function normalizedTokenCount(value: string) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").filter(Boolean).length : 0;
}

export function evaluateFamilyExerciseAnswer(
  exercise: FamilyPracticeExercise,
  userAnswer: string,
) {
  const normalizedAnswer = normalizeText(userAnswer);
  const normalizedExpected = normalizeText(exercise.expectedAnswer);

  if (!normalizedAnswer || !normalizedExpected) {
    return false;
  }

  if (exercise.type === "NATURAL_RESPONSE") {
    return normalizedAnswer === normalizedExpected;
  }

  if (exercise.type === "CONTINUE_CONVERSATION") {
    return (
      normalizedAnswer.includes(normalizedExpected) &&
      normalizedTokenCount(normalizedAnswer) >= 6
    );
  }

  return normalizedAnswer === normalizedExpected;
}

export function buildFamilyPracticeSummary(
  answers: FamilyPracticeAnswerPayload[],
) {
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  const averageResponseMs =
    answers.length === 0
      ? 0
      : Math.round(
          answers.reduce((sum, answer) => sum + answer.responseTimeMs, 0) /
            answers.length,
        );
  const accuracyRate =
    answers.length === 0
      ? 0
      : Math.round((correctAnswers / answers.length) * 100);

  return {
    totalQuestions: answers.length,
    correctAnswers,
    averageResponseMs,
    accuracyRate,
    score: accuracyRate,
  };
}
