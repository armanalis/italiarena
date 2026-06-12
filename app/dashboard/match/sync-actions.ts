"use server";

import {
  buildQuestionPlaylistPayload,
  parseQuestionPlaylist,
} from "@/lib/session-playlist";
import { createClient } from "@/utils/supabase/server";
import { TOPIC_REVEAL_MS, type MatchSyncState } from "@/lib/match-sync";

/**
 * @deprecated Hot-path match sync uses `publishMatchSync` in
 * `lib/match-sync-client.ts` (browser → Supabase). Do not call this from the
 * match loop: Next.js serializes server actions per tab and a single queued
 * action (e.g. report submit) stalled round advances for minutes.
 *
 * Kept for tooling / backwards compatibility only.
 */
export async function updateMatchSyncState(
  sessionId: string,
  state: MatchSyncState,
  appendQuestionId?: string
): Promise<
  | { success: true; sync: MatchSyncState; serverNow: number }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: session, error: readError } = await supabase
    .from("game_sessions")
    .select("player_a_id, status, question_playlist")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError || !session) {
    return { success: false, error: readError?.message ?? "Session not found." };
  }

  if (session.player_a_id !== user.id) {
    return { success: false, error: "Only the match host can drive sync." };
  }

  if (session.status !== "active") {
    return { success: false, error: "Match is not active." };
  }

  const parsed = parseQuestionPlaylist(session.question_playlist);
  const questionIds =
    appendQuestionId && !parsed.questionIds.includes(appendQuestionId)
      ? [...parsed.questionIds, appendQuestionId]
      : parsed.questionIds;

  // Server-clock stamp: the round becomes answerable TOPIC_REVEAL_MS from now,
  // measured on this clock. Client-provided timestamps are ignored on purpose.
  const stamped: MatchSyncState = {
    ...state,
    roundStartedAt:
      state.phase === "round" ? Date.now() + TOPIC_REVEAL_MS : Date.now(),
    updatedAt: Date.now(),
  };

  const { data: updated, error: updateError } = await supabase
    .from("game_sessions")
    .update({
      question_playlist: buildQuestionPlaylistPayload(questionIds, stamped),
      // New round → previous round's locked answers are consumed. Clients
      // also filter answers by questionIndex, so a stale write that races
      // this clear is ignored anyway.
      ...(state.phase === "round" ? { answer_a: null, answer_b: null } : {}),
    })
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // RLS can silently match zero rows; treat that as a hard failure so the
  // caller retries instead of assuming the round state was published.
  if (!updated) {
    return {
      success: false,
      error: "Sync write was blocked (no row updated). Check game_sessions RLS.",
    };
  }

  return { success: true, sync: stamped, serverNow: Date.now() };
}

/**
 * Clock reference for sync timestamps. Clients call this a few times at match
 * start to estimate the offset between their device clock and this server's
 * clock (which stamps `roundStartedAt`).
 *
 * NOTE: do NOT add high-frequency server actions to the match loop. Next.js
 * runs server actions from one client SEQUENTIALLY in a single queue, so a
 * 300ms action-based poll backs up the queue and stalls every other action
 * (round advance, answers, reports) for minutes. All high-frequency match
 * traffic goes directly from the browser to Supabase instead.
 */
export async function getServerNow(): Promise<number> {
  return Date.now();
}
