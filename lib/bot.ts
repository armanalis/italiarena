import type { ProficiencyLevel } from "@/lib/constants";
import type { CorrectAnswer, QuestionActive } from "@/types/database.types";

const BOT_ACCURACY = 0.7;

const OPTIONS: CorrectAnswer[] = ["A", "B", "C", "D"];

export const BOT_RESPONSE_TIME_MS = 10_000;

/** Ghost always answers 10 seconds after the round starts. */
export function getBotResponseDelayMs(roundStartedAt: number): number {
  return Math.max(0, BOT_RESPONSE_TIME_MS - (Date.now() - roundStartedAt));
}

function pickWrongAnswer(correct: CorrectAnswer): CorrectAnswer {
  const wrong = OPTIONS.filter((option) => option !== correct);
  return wrong[Math.floor(Math.random() * wrong.length)];
}

const LEVEL_ACCURACY: Record<ProficiencyLevel, number> = {
  A1: 0.62,
  "A1-A2": 0.65,
  A2: 0.67,
  "A2-B1": 0.68,
  B1: 0.7,
  B2: 0.72,
  C1: 0.74,
};

/** Bot answers correctly ~70% of the time, with a slight bump for higher levels. */
export function simulateBotAnswer(
  question: QuestionActive,
  proficiency: ProficiencyLevel
): CorrectAnswer {
  const accuracy = LEVEL_ACCURACY[proficiency] ?? BOT_ACCURACY;
  const isCorrect = Math.random() < accuracy;

  if (isCorrect) {
    return question.correct_answer;
  }

  return pickWrongAnswer(question.correct_answer);
}
