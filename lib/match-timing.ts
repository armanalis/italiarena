/** Shared match pacing — tune how long players see results between questions. */

/** Category flash before the question becomes answerable. */
export const TOPIC_REVEAL_MS = 1_200;

/** Seconds on the round clock for each question. */
export const ROUND_DURATION_SEC = 25;

/** How long the answer-reveal screen stays up before the next question. */
export const ROUND_RESULT_MS = {
  /** Bot / ghost — solo read time, no sync wait. */
  bot: 4_000,
  /** Real opponent — both players compare answers; extra beat for sync. */
  pvp: 5_000,
} as const;

export function getRoundResultMs(isBotMatch: boolean) {
  return isBotMatch ? ROUND_RESULT_MS.bot : ROUND_RESULT_MS.pvp;
}
