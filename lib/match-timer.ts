/** Elapsed pause time for the active question countdown (ms). */
export function getRoundPauseMs(state: {
  timerPauseOffsetMs: number;
  timerPauseStartedAt: number | null;
}): number {
  const activePause = state.timerPauseStartedAt
    ? Date.now() - state.timerPauseStartedAt
    : 0;
  return state.timerPauseOffsetMs + activePause;
}

export function getRoundElapsedSec(
  roundStartedAt: number,
  pauseMs: number
): number {
  return Math.floor((Date.now() - roundStartedAt - pauseMs) / 1000);
}
