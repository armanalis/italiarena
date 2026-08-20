/**
 * Browser → Supabase match sync (hot path).
 *
 * Everything here bypasses Next.js server actions on purpose. Server actions
 * from one tab run in a single serial queue; a slow report submit or a
 * blocked action was stalling `updateMatchSyncState` for minutes between
 * questions even after polling moved off the server.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isMatchScoreState,
  type MatchScoreState,
} from "@/lib/match-score-state";
import { TOPIC_REVEAL_MS, type MatchSyncState } from "@/lib/match-sync";
import {
  buildQuestionPlaylistPayload,
  parseQuestionPlaylist,
} from "@/lib/session-playlist";
import type { QuestionActive } from "@/types/database.types";

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
  /** Legacy: append only the id (follower must refetch). Prefer appendQuestion. */
  appendQuestionId?: string;
  /**
   * Sudden-death question to append. The full row is stored in the playlist
   * payload so both clients enter the round from the same poll.
   */
  appendQuestion?: QuestionActive;
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
  const appendId = input.appendQuestion?.id ?? input.appendQuestionId;
  const questionIds =
    appendId && !parsed.questionIds.includes(appendId)
      ? [...parsed.questionIds, appendId]
      : parsed.questionIds;

  const questionBank = { ...parsed.questionBank };
  if (input.appendQuestion) {
    questionBank[input.appendQuestion.id] = input.appendQuestion;
  }

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
      question_playlist: buildQuestionPlaylistPayload(
        questionIds,
        stamped,
        questionBank
      ),
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

  // Locked answers live in columns the client can no longer write directly
  // (see supabase/match-answer-integrity-migration.sql) — route the reset
  // through the RPC so a new round always starts from a clean slate.
  if (input.phase === "round") {
    const { error: clearError } = await supabase.rpc(
      "clear_match_round_answers",
      { p_session_id: sessionId }
    );

    if (clearError) {
      console.error(
        `[match-sync] answer clear failed: ${clearError.message}`
      );
    }
  }

  return { success: true, sync: stamped, serverNow };
}

/**
 * Host fetches a sudden-death question via browser → Supabase RPC.
 * Avoids the per-tab Next.js server-action queue that can stall mid-match.
 */
export async function fetchTiebreakerQuestionClient(
  supabase: SupabaseClient,
  input: {
    language: string;
    level: string;
    userId: string;
    excludeIds: string[];
  }
): Promise<
  | { success: true; data: QuestionActive }
  | { success: false; error: string }
> {
  const { data, error } = await supabase.rpc("get_tiebreaker_question", {
    p_language: input.language,
    p_level: input.level,
    p_user_id: input.userId,
    p_exclude_ids: input.excludeIds,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return {
      success: false,
      error: "No tiebreaker question available for your Italian level.",
    };
  }

  return { success: true, data: data as QuestionActive };
}

/**
 * Persist cumulative scores after a round resolves. Monotonic: never lets a
 * stale client overwrite a document that already includes more rounds.
 */
export async function persistMatchScoreState(
  supabase: SupabaseClient,
  sessionId: string,
  score: MatchScoreState
): Promise<{ success: true } | { success: false; error: string }> {
  const { data: session, error: readError } = await supabase
    .from("game_sessions")
    .select("score_state")
    .eq("id", sessionId)
    .maybeSingle();

  if (readError) {
    return { success: false, error: readError.message };
  }

  const existing = isMatchScoreState(session?.score_state)
    ? session.score_state
    : null;

  if (
    existing &&
    (existing.resolvedThroughIndex > score.resolvedThroughIndex ||
      (existing.resolvedThroughIndex === score.resolvedThroughIndex &&
        existing.matchFinished &&
        !score.matchFinished))
  ) {
    return { success: true };
  }

  const { data: updated, error: updateError } = await supabase
    .from("game_sessions")
    .update({ score_state: score })
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
        "Score write was blocked (no row updated). Check game_sessions RLS and run supabase/match-score-state-migration.sql.",
    };
  }

  return { success: true };
}
