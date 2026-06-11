/**
 * Server-authoritative match sync protocol.
 *
 * The host (player A) writes ONE record per round into the session row:
 * `{ questionIndex, phase: "round", roundStartedAt }` where `roundStartedAt`
 * is the wall-clock moment the question becomes answerable. Every client
 * derives the visible phase purely from its own clock:
 *
 *   now <  roundStartedAt  →  topic reveal
 *   now >= roundStartedAt  →  question (playing)
 *
 * Because the transition is a clock comparison instead of a second write or a
 * realtime broadcast, a client can never get stuck on the topic screen: each
 * poll re-derives the correct phase. It also makes both devices flip to the
 * question at the same wall-clock instant.
 */

/** Bumped on protocol changes; surfaced in the UI to verify deployed builds. */
export const MATCH_SYNC_VERSION = "v3";

export type MatchSyncState = {
  /** Index into the session's question playlist. */
  questionIndex: number;
  phase: "round" | "match_finished";
  /** Wall-clock ms timestamp when answering starts for this round. */
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
