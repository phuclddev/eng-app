import type {
  ChunkRecord,
  PracticeAnswerPayload,
  PracticeExercise,
  PracticeLearningStage,
  PracticeMode,
} from "@/lib/types";
import { normalizeText } from "@/lib/utils";

type StagePlan = {
  exerciseType: PracticeExercise["type"];
  learningStage: PracticeLearningStage;
  stageRank: number;
};

const STAGE_PRIORITY: Record<PracticeLearningStage, number> = {
  RECOGNITION: 0,
  RECALL: 1,
  PRODUCTION: 2,
};

function stableHash(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function stableSortBySeed<T>(
  items: T[],
  seed: string,
  getValue: (item: T) => string,
) {
  return [...items].sort((left, right) => {
    const leftKey = `${seed}:${getValue(left)}`;
    const rightKey = `${seed}:${getValue(right)}`;
    return stableHash(leftKey) - stableHash(rightKey) || leftKey.localeCompare(rightKey);
  });
}

export function inferChunkStagePlan(chunk: ChunkRecord): StagePlan {
  const review = chunk.review;

  if (!review) {
    return {
      learningStage: "RECOGNITION",
      exerciseType: "MULTIPLE_CHOICE",
      stageRank: 0,
    };
  }

  if (review.reviewCount <= 1 || review.masteryScore < 35) {
    return {
      learningStage: "RECOGNITION",
      exerciseType: "FILL_IN_BLANK",
      stageRank: 1,
    };
  }

  if (review.reviewCount <= 3 || review.masteryScore < 75) {
    return {
      learningStage: "RECALL",
      exerciseType: "VI_TO_CHUNK",
      stageRank: 2,
    };
  }

  if (review.reviewCount <= 5 || review.masteryScore < 90 || review.intervalDays < 14) {
    return {
      learningStage: "PRODUCTION",
      exerciseType: "REWRITE_SENTENCE",
      stageRank: 3,
    };
  }

  return {
    learningStage: "PRODUCTION",
    exerciseType: "CREATE_SENTENCE",
    stageRank: 4,
  };
}

function createMultipleChoice(
  chunk: ChunkRecord,
  pool: ChunkRecord[],
  learningStage: PracticeLearningStage,
): PracticeExercise {
  const distractors = pool
    .filter((candidate) => candidate.id !== chunk.id)
    .slice(0, 12)
    .sort(
      (left, right) =>
        Math.abs(left.bandLevel - chunk.bandLevel) -
        Math.abs(right.bandLevel - chunk.bandLevel),
    )
    .slice(0, 3)
    .map((candidate) => candidate.chunk);
  const options = stableSortBySeed(
    [chunk.chunk, ...distractors],
    `${chunk.id}:mcq`,
    (option) => option,
  );

  return {
    id: `${chunk.id}-mcq`,
    chunkId: chunk.id,
    type: "MULTIPLE_CHOICE",
    learningStage,
    prompt: `Choose the best chunk for: ${chunk.meaningVi}`,
    expectedAnswer: chunk.chunk,
    options,
    hint: chunk.topic?.name ?? undefined,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createFillInBlank(
  chunk: ChunkRecord,
  learningStage: PracticeLearningStage,
): PracticeExercise {
  const hiddenSentence = chunk.example.replace(
    new RegExp(chunk.chunk, "i"),
    "_____",
  );

  return {
    id: `${chunk.id}-fill`,
    chunkId: chunk.id,
    type: "FILL_IN_BLANK",
    learningStage,
    prompt:
      hiddenSentence === chunk.example
        ? `Fill the blank with the correct chunk: ${chunk.meaningVi}`
        : hiddenSentence,
    expectedAnswer: chunk.chunk,
    hint: chunk.meaningVi,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createViToChunk(
  chunk: ChunkRecord,
  learningStage: PracticeLearningStage,
): PracticeExercise {
  return {
    id: `${chunk.id}-vi`,
    chunkId: chunk.id,
    type: "VI_TO_CHUNK",
    learningStage,
    prompt: `Type the English chunk for: ${chunk.meaningVi}`,
    expectedAnswer: chunk.chunk,
    hint: chunk.example,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createRewriteSentence(
  chunk: ChunkRecord,
  learningStage: PracticeLearningStage,
): PracticeExercise {
  const seed =
    chunk.wrongExamples[0] ??
    `Rewrite the sentence so it uses "${chunk.chunk}" naturally.`;

  return {
    id: `${chunk.id}-rewrite`,
    chunkId: chunk.id,
    type: "REWRITE_SENTENCE",
    learningStage,
    prompt: seed,
    expectedAnswer: chunk.chunk,
    hint: "Your answer should include the target chunk naturally.",
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createProductionPrompt(
  chunk: ChunkRecord,
  learningStage: PracticeLearningStage,
): PracticeExercise {
  return {
    id: `${chunk.id}-create`,
    chunkId: chunk.id,
    type: "CREATE_SENTENCE",
    learningStage,
    prompt: `Create an IELTS-style sentence using "${chunk.chunk}".`,
    expectedAnswer: chunk.chunk,
    hint: chunk.example,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createExercise(
  plan: StagePlan,
  chunk: ChunkRecord,
  pool: ChunkRecord[],
) {
  switch (plan.exerciseType) {
    case "MULTIPLE_CHOICE":
      return createMultipleChoice(chunk, pool, plan.learningStage);
    case "FILL_IN_BLANK":
      return createFillInBlank(chunk, plan.learningStage);
    case "VI_TO_CHUNK":
      return createViToChunk(chunk, plan.learningStage);
    case "REWRITE_SENTENCE":
      return createRewriteSentence(chunk, plan.learningStage);
    case "CREATE_SENTENCE":
      return createProductionPrompt(chunk, plan.learningStage);
  }
}

export function buildPracticeDeck(
  chunks: ChunkRecord[],
  mode: PracticeMode,
  maxItems = 10,
) {
  const selected = chunks.slice(0, maxItems);

  return selected
    .map((chunk) => ({
      chunk,
      plan: inferChunkStagePlan(chunk),
    }))
    .sort((left, right) => {
      const stagePriorityDiff =
        STAGE_PRIORITY[left.plan.learningStage] - STAGE_PRIORITY[right.plan.learningStage];

      if (stagePriorityDiff !== 0) {
        return stagePriorityDiff;
      }

      const stageRankDiff = left.plan.stageRank - right.plan.stageRank;

      if (stageRankDiff !== 0) {
        return stageRankDiff;
      }

      return (
        stableHash(`${mode}:${left.chunk.id}:${left.plan.exerciseType}`) -
          stableHash(`${mode}:${right.chunk.id}:${right.plan.exerciseType}`) ||
        left.chunk.id.localeCompare(right.chunk.id)
      );
    })
    .map(({ chunk, plan }) => createExercise(plan, chunk, chunks));
}

export function evaluateExerciseAnswer(
  exercise: PracticeExercise,
  userAnswer: string,
) {
  const normalizedAnswer = normalizeText(userAnswer);
  const normalizedExpected = normalizeText(exercise.expectedAnswer);

  if (exercise.type === "MULTIPLE_CHOICE") {
    return normalizedAnswer === normalizedExpected;
  }

  if (
    exercise.type === "REWRITE_SENTENCE" ||
    exercise.type === "CREATE_SENTENCE"
  ) {
    return (
      normalizedAnswer.includes(normalizedExpected) &&
      normalizedAnswer.split(" ").length >= 6
    );
  }

  return normalizedAnswer === normalizedExpected;
}

export function buildPracticeSummary(answers: PracticeAnswerPayload[]) {
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  const averageResponseMs =
    answers.length === 0
      ? 0
      : Math.round(
          answers.reduce((sum, answer) => sum + answer.responseMs, 0) /
            answers.length,
        );

  return {
    correctAnswers,
    totalQuestions: answers.length,
    averageResponseMs,
    accuracyRate:
      answers.length === 0 ? 0 : Math.round((correctAnswers / answers.length) * 100),
  };
}
