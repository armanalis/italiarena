/**
 * Server-authoritative match sync protocol.
 *
 * The host (player A) triggers ONE record per round into the session row:
 * `{ questionIndex, phase: "round", roundStartedAt }`.
 *
 * CRITICAL CLOCK RULE (v4): `roundStartedAt` is stamped by the SERVER when the
 * write lands, and every poll response carries `serverNow` (the server's
 * current time). Clients only ever compare `roundStartedAt` against
 * `serverNow` — two timestamps from the SAME clock:
 *
 *   serverNow <  roundStartedAt  →  topic reveal (flip in roundStartedAt - serverNow ms)
 *   serverNow >= roundStartedAt  →  question (playing)
 *
 * v3 compared the host device's wall clock against the other device's wall
 * clock. Phones and PCs routinely disagree by seconds-to-minutes, which froze
 * the second device on the topic screen forever while the host played alone.
 * Device clocks are never compared against each other anymore.
 */

/**
 * Bumped on protocol changes; surfaced in the UI to verify deployed builds.
 * v6: round publish (host advancing to the next question) also goes directly
 * browser → Supabase with a Postgres clock stamp. v5 still used a server
 * action for that one write, which sat in the same per-tab action queue as
 * reports and could stall 2–6 minutes between questions.
 */
export const MATCH_SYNC_VERSION = "v6";

/** Topic reveal duration before a question becomes answerable. */
export const TOPIC_REVEAL_MS = 750;

export type MatchSyncState = {
  /** Index into the session's question playlist. */
  questionIndex: number;
  phase: "round" | "match_finished";
  /**
   * SERVER-clock ms timestamp when answering starts for this round.
   * Only compare against the server's `serverNow`, never against the
   * device's own `Date.now()`.
   */
  roundStartedAt: number;
  updatedAt?: number;
};

export function isMatchSyncState(value: unknown): value is MatchSyncState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as MatchSyncState;
  return (
    typeof state.questionIndex === "number" &&
    (state.phase === "round" || state.phase === "match_finished") &&
    typeof state.roundStartedAt === "number"
  );
}

/**
 * One player's locked answer for a round, persisted on the session row
 * (game_sessions.answer_a / answer_b) and delivered through the sync poll.
 * Realtime broadcasts remain the low-latency fast path; this is the reliable
 * path, so a missed broadcast can no longer stall a round for the full 25s.
 */
export type MatchAnswerRecord = {
  questionIndex: number;
  /** null = the player timed out without answering. */
  answer: "A" | "B" | "C" | "D" | null;
  responseTimeMs: number | null;
  submittedAt: number;
};

export function isMatchAnswerRecord(
  value: unknown
): value is MatchAnswerRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as MatchAnswerRecord;
  return (
    typeof record.questionIndex === "number" &&
    (record.answer === null ||
      record.answer === "A" ||
      record.answer === "B" ||
      record.answer === "C" ||
      record.answer === "D") &&
    (record.responseTimeMs === null ||
      typeof record.responseTimeMs === "number")
  );
}
