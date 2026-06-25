import type { ProficiencyLevel } from "@/lib/constants";
import type { CorrectAnswer, QuestionActive } from "@/types/database.types";

/** Player-facing bot tiers. `standard` is kept only for older links — same as medium. */
export type BotDifficulty = "easy" | "medium" | "hard";
export type BotDifficultyParam = BotDifficulty | "standard";

const BOT_ACCURACY = 0.7;

const OPTIONS: CorrectAnswer[] = ["A", "B", "C", "D"];

/** Default bot match — medium answers after 10 seconds. */
export const BOT_RESPONSE_TIME_MS = 10_000;

const BOT_RESPONSE_MS: Record<BotDifficulty, number> = {
  easy: 15_000,
  medium: 10_000,
  hard: 5_000,
};

export const BOT_DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  easy: "Easy Bot",
  medium: "Medium Bot",
  hard: "Hard Bot",
};

export function normalizeBotDifficulty(
  value: string | null | undefined
): BotDifficulty {
  if (value === "easy" || value === "medium" || value === "hard") {
    return value;
  }
  return "medium";
}

export function isBotDifficultyParam(
  value: string | null | undefined
): value is BotDifficultyParam {
  return (
    value === "standard" ||
    value === "easy" ||
    value === "medium" ||
    value === "hard"
  );
}

export function getBotResponseTimeMs(difficulty: BotDifficulty = "medium"): number {
  return BOT_RESPONSE_MS[difficulty];
}

/** Delay until the bot locks an answer, relative to round start. */
export function getBotResponseDelayMs(
  roundStartedAt: number,
  difficulty: BotDifficulty = "medium",
  pauseMs = 0
): number {
  return Math.max(
    0,
    getBotResponseTimeMs(difficulty) - (Date.now() - roundStartedAt - pauseMs)
  );
}

/** Resolve bot tier from the ghost opponent label stored on the session. */
export function botDifficultyFromDisplayName(
  displayName: string
): BotDifficulty {
  for (const [difficulty, label] of Object.entries(BOT_DIFFICULTY_LABELS)) {
    if (displayName === label) {
      return difficulty as BotDifficulty;
    }
  }
  return "medium";
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

const DIFFICULTY_ACCURACY_BONUS: Record<BotDifficulty, number> = {
  easy: -0.12,
  medium: 0.08,
  hard: 0,
};

/** Bot answers based on difficulty — hard always picks the correct option. */
export function simulateBotAnswer(
  question: QuestionActive,
  proficiency: ProficiencyLevel,
  difficulty: BotDifficulty = "medium"
): CorrectAnswer {
  if (difficulty === "hard") {
    return question.correct_answer;
  }

  const baseAccuracy = LEVEL_ACCURACY[proficiency] ?? BOT_ACCURACY;
  const bonus = DIFFICULTY_ACCURACY_BONUS[difficulty];
  const accuracy = Math.min(0.95, Math.max(0.45, baseAccuracy + bonus));
  const isCorrect = Math.random() < accuracy;

  if (isCorrect) {
    return question.correct_answer;
  }

  return pickWrongAnswer(question.correct_answer);
}

export function getBotDifficultyDescription(difficulty: BotDifficulty): string {
  switch (difficulty) {
    case "easy":
      return "15s per answer · makes more mistakes";
    case "medium":
      return "10s per answer · smarter than Easy";
    case "hard":
      return "5s per answer · always correct";
  }
}
