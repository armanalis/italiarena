import type { CorrectAnswer } from "@/types/database.types";

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

export function determineWinner(
  playerAScore: number,
  playerBScore: number,
  playerAResponseTimes: number[],
  playerBResponseTimes: number[]
): MatchWinner {
  if (playerAScore > playerBScore) {
    return "a";
  }
  if (playerBScore > playerAScore) {
    return "b";
  }

  const avgA = averageResponseTime(playerAResponseTimes);
  const avgB = averageResponseTime(playerBResponseTimes);

  if (avgA === null && avgB === null) {
    return "tie";
  }
  if (avgA === null) {
    return "b";
  }
  if (avgB === null) {
    return "a";
  }
  if (avgA < avgB) {
    return "a";
  }
  if (avgB < avgA) {
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

export function formatCategoryLabel(category: string): string {
  return category.replace(/-/g, " ").toUpperCase();
}
