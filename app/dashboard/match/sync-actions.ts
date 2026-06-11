"use server";

import { createClient } from "@/utils/supabase/server";
import type { MatchSyncState } from "@/lib/match-sync";

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
    .select("player_a_id, status")
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

  const { error: updateError } = await supabase
    .from("game_sessions")
    .update({
      match_sync: {
        ...state,
        updatedAt: Date.now(),
      },
    })
    .eq("id", sessionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}
