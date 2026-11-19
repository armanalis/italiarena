import { ROUND_DURATION_SEC } from "@/lib/match-timing";

/** Seconds elapsed since the round became answerable (never negative). */
export function getRoundElapsedSec(roundStartedAt: number): number {
  return Math.max(0, Math.floor((Date.now() - roundStartedAt) / 1000));
}

/** Seconds left on the question clock — always in `[0, ROUND_DURATION_SEC]`. */
export function getRoundTimeRemainingSec(
  roundStartedAt: number,
  durationSec: number = ROUND_DURATION_SEC
): number {
  const remaining = durationSec - getRoundElapsedSec(roundStartedAt);
  return Math.min(durationSec, Math.max(0, remaining));
}

/** Reset whenever a new question starts. */
export const FRESH_ROUND_TIMER_STATE = {
  timeRemaining: ROUND_DURATION_SEC,
} as const;
