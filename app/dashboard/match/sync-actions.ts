"use server";

import {
  buildQuestionPlaylistPayload,
  parseQuestionPlaylist,
} from "@/lib/session-playlist";
import { createClient } from "@/utils/supabase/server";
import {
  TOPIC_REVEAL_MS,
  isMatchAnswerRecord,
  type MatchAnswerRecord,
  type MatchSyncState,
} from "@/lib/match-sync";

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
 * Both players persist their locked answer here every round. The opponent
 * receives it through the next sync poll (≤300ms), so the round resolves
 * immediately even when the realtime broadcast is dropped.
 */
export async function submitMatchAnswer(
  sessionId: string,
  payload: {
    questionIndex: number;
    answer: "A" | "B" | "C" | "D" | null;
    responseTimeMs: number | null;
  }
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: session, error: readError } = await supabase
    .from("game_sessions")
    .select("player_a_id, player_b_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError || !session) {
    return { success: false, error: readError?.message ?? "Session not found." };
  }

  // Each player only ever writes their own column, so the two writers can
  // never clobber each other.
  const column =
    session.player_a_id === user.id
      ? "answer_a"
      : session.player_b_id === user.id
        ? "answer_b"
        : null;

  if (!column) {
    return { success: false, error: "Not part of this match." };
  }

  if (session.status !== "active") {
    return { success: false, error: "Match is not active." };
  }

  const record: MatchAnswerRecord = {
    ...payload,
    submittedAt: Date.now(),
  };

  const { error: updateError } = await supabase
    .from("game_sessions")
    .update({ [column]: record })
    .eq("id", sessionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Lightweight poll target: returns the round sync state, both players'
 * persisted answers, and opponent presence. Avoids resolving full question
 * rows / display names on every poll.
 */
export async function getMatchSyncState(sessionId: string): Promise<
  | {
      success: true;
      sync: MatchSyncState | null;
      answerA: MatchAnswerRecord | null;
      answerB: MatchAnswerRecord | null;
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
    .select(
      "player_a_id, player_b_id, status, question_playlist, answer_a, answer_b"
    )
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
    answerA: isMatchAnswerRecord(session.answer_a) ? session.answer_a : null,
    answerB: isMatchAnswerRecord(session.answer_b) ? session.answer_b : null,
    hasOpponent: Boolean(session.player_b_id),
    status: session.status,
    serverNow: Date.now(),
  };
}
