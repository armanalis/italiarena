/**
 * Browser → Supabase match sync (hot path).
 *
 * Everything here bypasses Next.js server actions on purpose. Server actions
 * from one tab run in a single serial queue; a slow report submit or a
 * blocked action was stalling `updateMatchSyncState` for minutes between
 * questions even after polling moved off the server.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOPIC_REVEAL_MS, type MatchSyncState } from "@/lib/match-sync";
import {
  buildQuestionPlaylistPayload,
  parseQuestionPlaylist,
} from "@/lib/session-playlist";

const CLOCK_SAMPLES = 3;

export async function fetchServerTimeMs(
  supabase: SupabaseClient
): Promise<number | null> {
  const { data, error } = await supabase.rpc("get_server_time_ms");

  if (error) {
    console.error(`[match-sync] get_server_time_ms failed: ${error.message}`);
    return null;
  }

  const value = typeof data === "number" ? data : Number(data);
  return Number.isFinite(value) ? value : null;
}

/** Estimate localClock + offset ≈ Postgres clock (min-RTT sample). */
export async function estimateClockOffsetMs(
  supabase: SupabaseClient
): Promise<number> {
  let bestRtt = Number.POSITIVE_INFINITY;
  let bestOffset = 0;

  for (let sample = 0; sample < CLOCK_SAMPLES; sample += 1) {
    const t0 = Date.now();
    const serverNow = await fetchServerTimeMs(supabase);
    const rtt = Date.now() - t0;

    if (serverNow === null) {
      continue;
    }

    if (rtt < bestRtt) {
      bestRtt = rtt;
      bestOffset = serverNow - (t0 + rtt / 2);
    }
  }

  return bestOffset;
}

type PublishSyncInput = {
  questionIndex: number;
  phase: MatchSyncState["phase"];
  appendQuestionId?: string;
};

/**
 * Host publishes the next round (or match_finished). Stamps `roundStartedAt`
 * with the Postgres clock via `get_server_time_ms`, clears per-round answers,
 * and returns the exact record every client will read on the next poll.
 */
export async function publishMatchSync(
  supabase: SupabaseClient,
  sessionId: string,
  input: PublishSyncInput
): Promise<
  | { success: true; sync: MatchSyncState; serverNow: number }
  | { success: false; error: string }
> {
  const { data: session, error: readError } = await supabase
    .from("game_sessions")
    .select("status, question_playlist")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError || !session) {
    return {
      success: false,
      error: readError?.message ?? "Session not found.",
    };
  }

  if (session.status !== "active") {
    return { success: false, error: "Match is not active." };
  }

  const parsed = parseQuestionPlaylist(session.question_playlist);
  const questionIds =
    input.appendQuestionId &&
    !parsed.questionIds.includes(input.appendQuestionId)
      ? [...parsed.questionIds, input.appendQuestionId]
      : parsed.questionIds;

  const serverNow = (await fetchServerTimeMs(supabase)) ?? Date.now();
  const stamped: MatchSyncState = {
    questionIndex: input.questionIndex,
    phase: input.phase,
    roundStartedAt:
      input.phase === "round" ? serverNow + TOPIC_REVEAL_MS : serverNow,
    updatedAt: serverNow,
  };

  const { data: updated, error: updateError } = await supabase
    .from("game_sessions")
    .update({
      question_playlist: buildQuestionPlaylistPayload(questionIds, stamped),
      ...(input.phase === "round"
        ? { answer_a: null, answer_b: null }
        : {}),
    })
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (!updated) {
    return {
      success: false,
      error:
        "Sync write was blocked (no row updated). Check game_sessions RLS and run supabase/match-answers-migration.sql if answers never arrive.",
    };
  }

  return { success: true, sync: stamped, serverNow };
}
