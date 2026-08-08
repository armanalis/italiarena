import { ROUND_DURATION_SEC } from "@/lib/match-timing";

/** Elapsed pause time for the active question countdown (ms). */
export function getRoundPauseMs(state: {
  timerPauseOffsetMs: number;
  timerPauseStartedAt: number | null;
}, now: number = Date.now()): number {
  const activePause = state.timerPauseStartedAt
    ? now - state.timerPauseStartedAt
    : 0;
  return Math.max(0, state.timerPauseOffsetMs + activePause);
}

/**
 * Seconds elapsed since the round became answerable (never negative).
 * A future `roundStartedAt` (clock skew / late sync stamp) counts as zero
 * elapsed so the UI cannot open above `ROUND_DURATION_SEC`.
 */
export function getRoundElapsedSec(
  roundStartedAt: number,
  pauseMs: number,
  now: number = Date.now()
): number {
  const startedAt = Math.min(roundStartedAt, now);
  return Math.max(0, Math.floor((now - startedAt - pauseMs) / 1000));
}

/** Clamp a displayed/stored countdown into `[0, ROUND_DURATION_SEC]`. */
export function clampRoundTimeRemainingSec(
  seconds: number,
  durationSec: number = ROUND_DURATION_SEC
): number {
  if (!Number.isFinite(seconds)) {
    return durationSec;
  }
  return Math.min(durationSec, Math.max(0, Math.floor(seconds)));
}

/** Seconds left on the question clock — always in `[0, ROUND_DURATION_SEC]`. */
export function getRoundTimeRemainingSec(
  roundStartedAt: number,
  pauseMs: number,
  durationSec: number = ROUND_DURATION_SEC,
  now: number = Date.now()
): number {
  const remaining = durationSec - getRoundElapsedSec(roundStartedAt, pauseMs, now);
  return clampRoundTimeRemainingSec(remaining, durationSec);
}

/** Cleared whenever a new question starts so pause time cannot inflate the next clock. */
export const FRESH_ROUND_TIMER_STATE = {
  timerPauseOffsetMs: 0,
  timerPauseStartedAt: null as number | null,
  timeRemaining: ROUND_DURATION_SEC,
} as const;
