import type { CorrectAnswer, QuestionActive } from "@/types/database.types";

/** Speed bonus tiers — response time in milliseconds. */
export function computePoints(
  isCorrect: boolean,
  responseTimeMs: number | null
): number {
  if (!isCorrect || responseTimeMs === null) {
    return 0;
  }

  const seconds = responseTimeMs / 1000;

  if (seconds < 5) {
    return 140;
  }
  if (seconds < 10) {
    return 130;
  }
  if (seconds < 15) {
    return 120;
  }
  if (seconds <= 25) {
    return 100;
  }

  return 0;
}

export function averageResponseTime(times: number[]): number | null {
  if (times.length === 0) {
    return null;
  }

  return times.reduce((sum, time) => sum + time, 0) / times.length;
}

export type MatchWinner = "a" | "b" | "tie";

/**
 * Winner from total points only.
 *
 * Equal scores are a true tie. Speed already affects points during the round
 * (faster correct answers earn more), so response-time averages must not
 * silently overturn a tied scoreboard. Tied regular matches go to a
 * sudden-death question instead; if that also ends even, the match is a tie.
 */
export function determineWinner(
  playerAScore: number,
  playerBScore: number,
  _playerAResponseTimes: number[] = [],
  _playerBResponseTimes: number[] = []
): MatchWinner {
  if (playerAScore > playerBScore) {
    return "a";
  }
  if (playerBScore > playerAScore) {
    return "b";
  }

  return "tie";
}

export function isAnswerCorrect(
  selected: CorrectAnswer | null,
  correct: CorrectAnswer
): boolean {
  return selected !== null && selected === correct;
}

export function formatCategoryLabel(category: string | null | undefined): string {
  if (!category || typeof category !== "string") {
    return "GENERAL";
  }
  return category.replace(/-/g, " ").toUpperCase();
}

/** Text for a multiple-choice option letter on a question row. */
export function getOptionText(
  question: QuestionActive,
  answer: CorrectAnswer
): string {
  const key = `option_${answer.toLowerCase()}` as
    | "option_a"
    | "option_b"
    | "option_c"
    | "option_d";

  return question[key];
}
