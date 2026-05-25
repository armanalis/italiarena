import type { ProficiencyLevel } from "@/lib/constants";
import type { CorrectAnswer, QuestionActive } from "@/types/database.types";

const BOT_ACCURACY = 0.7;

const OPTIONS: CorrectAnswer[] = ["A", "B", "C", "D"];

/** Random delay between 4 and 18 seconds for bot answer simulation. */
export function getBotResponseDelayMs(): number {
  const minMs = 4000;
  const maxMs = 18000;
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
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
