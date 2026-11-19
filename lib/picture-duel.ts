/**
 * Picture Duel: two friends, a chess clock of 60 seconds each. A picture
 * appears; the player whose clock runs types its name. Right stops their
 * clock and starts the other's; Pass shows the answer while the clock keeps
 * running; the clock that reaches 0 loses. Every rule runs in the database
 * (supabase/migrations/*_picture_duel.sql); the browser calls it directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { knownError, type Result } from "@/lib/errors";

/** KEEP IN SYNC with supabase/migrations/*_picture_duel.sql. */
export const DUEL_CLOCK_MS = 60_000;
/** A lobby nobody joined closes after an hour. */
export const LOBBY_MS = 60 * 60 * 1000;
/** The topic that mixes every topic of the level. KEEP IN SYNC with *_picture_duel_all_topics.sql. */
export const ALL_TOPICS = "All topics";
/** Pictures are concrete things, so the duel stops at A2. */
export const PICTURE_LEVELS = ["A1", "A1-A2", "A2"] as const;

export type PictureTopic = { level: string; topic: string; emoji: string; count: number };
export type DuelLogEntry = { emoji: string; answer: string; by: string; result: "right" | "pass" };
export type PictureDuel = {
  id: string;
  host_id: string;
  guest_id: string | null;
  host_name: string;
  guest_name: string | null;
  language: string;
  level: string;
  topic: string;
  status: "waiting" | "active" | "finished" | "cancelled";
  created_at: string;
  /** 6 digits the host can read out instead of sending the link; null on duels from before codes. */
  code: string | null;
  /** Hard mode: an answer needs its article ("il latte", not "latte"). */
  hard: boolean;
  position: number;
  emoji: string | null;
  turn: string | null;
  turn_started_at: string | null;
  host_ms: number;
  guest_ms: number;
  host_score: number;
  guest_score: number;
  reveal_until: string | null;
  log: DuelLogEntry[];
  winner_id: string | null;
  finished_at: string | null;
  /** A rematch offer: who made it, and when their screen last renewed it. */
  rematch_by: string | null;
  rematch_at: string | null;
  /** The rematch, once both said yes. */
  rematch_id: string | null;
  rev: number;
};
/** article: hard mode, the word is right but its article is missing or wrong. */
export type AnswerResult = "right" | "wrong" | "article" | "pass" | "not_your_turn" | "not_yet" | "over";

/** A player's clock at `now` (server time, ms): only the running one moves, never below 0. */
export function clockMs(duel: PictureDuel, player: string, now: number): number {
  const stored = player === duel.host_id ? duel.host_ms : duel.guest_ms;
  if (duel.status !== "active" || duel.turn !== player || !duel.turn_started_at) {
    return stored;
  }
  return Math.max(0, stored - Math.max(0, now - Date.parse(duel.turn_started_at)));
}

/** The level a player starts on: their own, at most A2 (A2-B1 and above start on A2). */
export function pictureLevelFor(level: string): string {
  return (PICTURE_LEVELS as readonly string[]).includes(level) ? level : "A2";
}

const ERRORS: Record<string, string> = {
  no_such_topic: "This topic has no pictures yet.",
  not_open: "This duel has already started, was cancelled, or expired.",
  own_duel: "This is your own duel: send the link to a friend.",
  no_such_duel: "This duel is not yours.",
  too_many_tries: "Too many wrong codes. Try again in 15 minutes.",
  no_rematch: "A rematch is only possible once the duel is over.",
};

async function rpc<T>(supabase: SupabaseClient, name: string, args: object): Promise<Result<T>> {
  const { data, error } = await supabase.rpc(name, args);
  return error
    ? { ok: false, error: knownError(ERRORS, error.message, "Could not reach the game. Try again.") }
    : { ok: true, value: data as T };
}

export const createDuel = (supabase: SupabaseClient, language: string, level: string, topic: string, hard: boolean) =>
  rpc<string>(supabase, "picture_duel_create", { p_language: language, p_level: level, p_topic: topic, p_hard: hard });
export const joinDuel = (supabase: SupabaseClient, id: string) =>
  rpc<PictureDuel>(supabase, "picture_duel_join", { p_id: id });
export const answerDuel = (supabase: SupabaseClient, id: string, answer: string) =>
  rpc<{ result: AnswerResult; duel: PictureDuel }>(supabase, "picture_duel_answer", { p_id: id, p_answer: answer });
export const passDuel = (supabase: SupabaseClient, id: string) =>
  rpc<{ result: AnswerResult; duel: PictureDuel }>(supabase, "picture_duel_pass", { p_id: id });
export const timeoutDuel = (supabase: SupabaseClient, id: string) =>
  rpc<PictureDuel>(supabase, "picture_duel_timeout", { p_id: id });
export const cancelDuel = (supabase: SupabaseClient, id: string) =>
  rpc<null>(supabase, "picture_duel_cancel", { p_id: id });
/** Offers a rematch, or says yes to the other player's: the rematch's id once it started, else null. */
export const rematchDuel = (supabase: SupabaseClient, id: string) =>
  rpc<{ id: string | null }>(supabase, "picture_duel_rematch", { p_id: id });
/** The open lobby with this code, or null. */
export const findDuelByCode = (supabase: SupabaseClient, code: string) =>
  rpc<string | null>(supabase, "picture_duel_by_code", { p_code: code });

/** The participant's own copy of the duel (RLS: host or guest only). */
export async function loadDuel(supabase: SupabaseClient, id: string): Promise<PictureDuel | null> {
  const { data } = await supabase.from("picture_duels").select("*").eq("id", id).maybeSingle();
  return (data as PictureDuel | null) ?? null;
}
