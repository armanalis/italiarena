/**
 * Browser → Supabase match sync (hot path).
 *
 * Everything here bypasses Next.js server actions on purpose. Server actions
 * from one tab run in a single serial queue; a slow report submit or a
 * blocked action was stalling `updateMatchSyncState` for minutes between
 * questions even after polling moved off the server.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MatchScoreState } from "@/lib/match-score-state";
import { isMatchSyncState, type MatchSyncState } from "@/lib/match-sync";
import type { CorrectAnswer, PublicQuestion } from "@/types/database.types";

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
};

/**
 * Host publishes the next round (or match_finished) through the
 * publish_match_sync RPC: the database stamps `roundStartedAt` with its own
 * clock, clears answers left from earlier rounds, and never lets a client
 * rewrite the session's question ids. Returns the exact record every client
 * will read on the next poll.
 */
export async function publishMatchSync(
  supabase: SupabaseClient,
  sessionId: string,
  input: PublishSyncInput
): Promise<
  | { success: true; sync: MatchSyncState; serverNow: number }
  | { success: false; error: string }
> {
  const { data, error } = await supabase.rpc("publish_match_sync", {
    p_session_id: sessionId,
    p_question_index: input.questionIndex,
    p_phase: input.phase,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const result = data as { sync?: unknown; serverNow?: unknown } | null;
  const serverNow = Number(result?.serverNow);
  if (!isMatchSyncState(result?.sync) || !Number.isFinite(serverNow)) {
    return { success: false, error: "Unexpected publish response." };
  }

  return { success: true, sync: result.sync, serverNow };
}

/**
 * Appends a server-picked sudden-death question to the session (idempotent)
 * and returns it WITHOUT its answer. Browser → Supabase RPC, so it cannot
 * stall behind the per-tab Next.js server-action queue mid-match.
 */
export async function appendTiebreakerQuestion(
  supabase: SupabaseClient,
  sessionId: string
): Promise<
  | { success: true; data: PublicQuestion }
  | { success: false; error: string }
> {
  const { data, error } = await supabase.rpc("append_tiebreaker_question", {
    p_session_id: sessionId,
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

  return { success: true, data: data as PublicQuestion };
}

export type RoundReveal = {
  correctAnswer: CorrectAnswer;
  /** The caller's answer as locked on the server (null = timed out). */
  selectedAnswer: CorrectAnswer | null;
  selectedResponseTimeMs: number | null;
  /** Bot matches only: the bot's pick, decided on the server. */
  botAnswer: CorrectAnswer | null;
  /** PvP only: the opponent's pick, shown once our own answer is locked. */
  opponentAnswer: CorrectAnswer | null;
};

function asAnswer(value: unknown): CorrectAnswer | null {
  return value === "A" || value === "B" || value === "C" || value === "D"
    ? value
    : null;
}

/**
 * The round's correct answer. The database only reveals it once the caller's
 * own answer for that round is locked (reveal_round_answer), so the browser
 * never holds an answer before the player has committed.
 */
export async function revealRoundAnswer(
  supabase: SupabaseClient,
  sessionId: string,
  questionIndex: number
): Promise<{ success: true; data: RoundReveal } | { success: false; error: string }> {
  const { data, error } = await supabase.rpc("reveal_round_answer", {
    p_session_id: sessionId,
    p_question_index: questionIndex,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const reveal = data as Record<string, unknown> | null;
  const correctAnswer = asAnswer(reveal?.correctAnswer);
  if (!correctAnswer) {
    return { success: false, error: "Unexpected reveal response." };
  }

  return {
    success: true,
    data: {
      correctAnswer,
      selectedAnswer: asAnswer(reveal?.selectedAnswer),
      selectedResponseTimeMs:
        typeof reveal?.responseTimeMs === "number" ? reveal.responseTimeMs : null,
      botAnswer: asAnswer(reveal?.botAnswer),
      opponentAnswer: asAnswer(reveal?.opponentAnswer),
    },
  };
}

/**
 * Persist cumulative scores for a BOT match only. A bot never writes
 * answer_b, so resolve_match_round (server-computed PvP scoring) cannot
 * apply here, and there is no second real player for a forged score_state
 * to defraud — see supabase/match-score-integrity-migration.sql. Routes
 * through commit_bot_match_score, which the database only accepts for
 * sessions where the caller is the sole real participant against the ghost
 * opponent; it enforces the same monotonic guard server-side.
 */
export async function persistBotMatchScoreState(
  supabase: SupabaseClient,
  sessionId: string,
  score: MatchScoreState
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await supabase.rpc("commit_bot_match_score", {
    p_session_id: sessionId,
    p_score: score,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Resolve one PvP round server-side: points, correctness, and response time
 * are all derived from data the database already owns (locked answers,
 * questions_active, the round's server-stamped start time) instead of a
 * client-built document. Idempotent and strictly sequential — see
 * resolve_match_round in supabase/match-score-integrity-migration.sql.
 */
export async function resolveMatchRoundServer(
  supabase: SupabaseClient,
  sessionId: string,
  questionIndex: number
): Promise<{ success: true } | { success: false; error: string }> {
  const { error } = await supabase.rpc("resolve_match_round", {
    p_session_id: sessionId,
    p_question_index: questionIndex,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
