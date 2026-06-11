"use server";

import {
  buildQuestionPlaylistPayload,
  parseQuestionPlaylist,
} from "@/lib/session-playlist";
import { createClient } from "@/utils/supabase/server";
import { TOPIC_REVEAL_MS, type MatchSyncState } from "@/lib/match-sync";

/**
 * Host-only write of the authoritative round state. Optionally appends a
 * question id to the playlist (used for the sudden-death tiebreaker).
 *
 * For "round" records the server stamps `roundStartedAt` itself so that all
 * sync timestamps live on ONE clock. The stamped record and the server's
 * current time are returned so the host can apply the exact same instant the
 * opponent will derive from polling.
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
 * Lightweight poll target: returns only the round sync state + opponent
 * presence. Avoids resolving full question rows / display names on every poll.
 */
export async function getMatchSyncState(sessionId: string): Promise<
  | {
      success: true;
      sync: MatchSyncState | null;
      hasOpponent: boolean;
      status: string;
      /** Server's current time; the only clock sync timestamps may be compared to. */
      serverNow: number;
    }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: session, error } = await supabase
    .from("game_sessions")
    .select("player_a_id, player_b_id, status, question_playlist")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) {
    return { success: false, error: error?.message ?? "Session not found." };
  }

  const isParticipant =
    session.player_a_id === user.id || session.player_b_id === user.id;
  if (!isParticipant) {
    return { success: false, error: "Not part of this match." };
  }

  const { sync } = parseQuestionPlaylist(session.question_playlist);

  return {
    success: true,
    sync,
    hasOpponent: Boolean(session.player_b_id),
    status: session.status,
    serverNow: Date.now(),
  };
}
