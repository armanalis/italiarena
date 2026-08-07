import { ROUND_DURATION_SEC } from "@/lib/match-timing";

/** Elapsed pause time for the active question countdown (ms). */
export function getRoundPauseMs(state: {
  timerPauseOffsetMs: number;
  timerPauseStartedAt: number | null;
}): number {
  const activePause = state.timerPauseStartedAt
    ? Date.now() - state.timerPauseStartedAt
    : 0;
  return Math.max(0, state.timerPauseOffsetMs + activePause);
}

/** Seconds elapsed since the round became answerable (never negative). */
export function getRoundElapsedSec(
  roundStartedAt: number,
  pauseMs: number
): number {
  return Math.max(
    0,
    Math.floor((Date.now() - roundStartedAt - pauseMs) / 1000)
  );
}

/** Seconds left on the question clock — always in `[0, ROUND_DURATION_SEC]`. */
export function getRoundTimeRemainingSec(
  roundStartedAt: number,
  pauseMs: number,
  durationSec: number = ROUND_DURATION_SEC
): number {
  const remaining = durationSec - getRoundElapsedSec(roundStartedAt, pauseMs);
  return Math.min(durationSec, Math.max(0, remaining));
}

/** Cleared whenever a new question starts so pause time cannot inflate the next clock. */
export const FRESH_ROUND_TIMER_STATE = {
  timerPauseOffsetMs: 0,
  timerPauseStartedAt: null as number | null,
  timeRemaining: ROUND_DURATION_SEC,
} as const;
