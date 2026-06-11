"use server";

import {
  buildQuestionPlaylistPayload,
  parseQuestionPlaylist,
} from "@/lib/session-playlist";
import { createClient } from "@/utils/supabase/server";
import type { MatchSyncState } from "@/lib/match-sync";

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
  };
}

export async function updateMatchSyncState(
  sessionId: string,
  state: MatchSyncState
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
  const syncPayload: MatchSyncState = {
    ...state,
    updatedAt: Date.now(),
  };

  const { error: updateError } = await supabase
    .from("game_sessions")
    .update({
      question_playlist: buildQuestionPlaylistPayload(
        parsed.questionIds,
        syncPayload
      ),
    })
    .eq("id", sessionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
