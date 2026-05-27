import { EXERCISE_TYPES } from "@/lib/constants";
import type {
  ChunkRecord,
  PracticeAnswerPayload,
  PracticeExercise,
  PracticeMode,
} from "@/lib/types";
import { normalizeText, shuffleArray } from "@/lib/utils";

function createMultipleChoice(
  chunk: ChunkRecord,
  pool: ChunkRecord[],
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

  return {
    id: `${chunk.id}-mcq`,
    chunkId: chunk.id,
    type: "MULTIPLE_CHOICE",
    prompt: `Choose the best chunk for: ${chunk.meaningVi}`,
    expectedAnswer: chunk.chunk,
    options: shuffleArray([chunk.chunk, ...distractors]),
    hint: chunk.topic?.name ?? undefined,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createFillInBlank(chunk: ChunkRecord): PracticeExercise {
  const hiddenSentence = chunk.example.replace(
    new RegExp(chunk.chunk, "i"),
    "_____",
  );

  return {
    id: `${chunk.id}-fill`,
    chunkId: chunk.id,
    type: "FILL_IN_BLANK",
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

function createViToChunk(chunk: ChunkRecord): PracticeExercise {
  return {
    id: `${chunk.id}-vi`,
    chunkId: chunk.id,
    type: "VI_TO_CHUNK",
    prompt: `Type the English chunk for: ${chunk.meaningVi}`,
    expectedAnswer: chunk.chunk,
    hint: chunk.example,
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createRewriteSentence(chunk: ChunkRecord): PracticeExercise {
  const seed =
    chunk.wrongExamples[0] ??
    `Rewrite the sentence so it uses "${chunk.chunk}" naturally.`;

  return {
    id: `${chunk.id}-rewrite`,
    chunkId: chunk.id,
    type: "REWRITE_SENTENCE",
    prompt: seed,
    expectedAnswer: chunk.chunk,
    hint: "Your answer should include the target chunk naturally.",
    chunk: chunk.chunk,
    meaningVi: chunk.meaningVi,
    example: chunk.example,
    topic: chunk.topic?.name ?? null,
  };
}

function createProductionPrompt(chunk: ChunkRecord): PracticeExercise {
  return {
    id: `${chunk.id}-create`,
    chunkId: chunk.id,
    type: "CREATE_SENTENCE",
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
  type: (typeof EXERCISE_TYPES)[number],
  chunk: ChunkRecord,
  pool: ChunkRecord[],
) {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return createMultipleChoice(chunk, pool);
    case "FILL_IN_BLANK":
      return createFillInBlank(chunk);
    case "VI_TO_CHUNK":
      return createViToChunk(chunk);
    case "REWRITE_SENTENCE":
      return createRewriteSentence(chunk);
    case "CREATE_SENTENCE":
      return createProductionPrompt(chunk);
  }
}

export function buildPracticeDeck(
  chunks: ChunkRecord[],
  _mode: PracticeMode,
  maxItems = 10,
) {
  const selected = chunks.slice(0, maxItems);

  return selected.map((chunk, index) =>
    createExercise(EXERCISE_TYPES[index % EXERCISE_TYPES.length], chunk, chunks),
  );
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
