/**
 * "Today with friends": your and your friends' finished results for today in
 * the language being played (get_friends_today: scores only, never answers).
 * Tested by scripts/test-friends-today.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTICLE_GAME_NAME } from "@/lib/articles";
import type { TargetLanguage } from "@/lib/constants";
import { WORDLE_MAX_GUESSES } from "@/lib/wordle";

export type FriendToday = {
  user_id: string;
  display_name: string;
  is_me: boolean;
  wordle: { level: string; guesses: number; won: boolean } | null;
  word_wheel: { level: string; right: number; total: number } | null;
  sprint: { level: string; score: number } | null;
};

/** Sorting score: Wordle 1–6 (fewer guesses, more), Word Wheel letters right, the Sprint score. */
export function todayPoints(row: FriendToday): number {
  const wordle = row.wordle?.won ? WORDLE_MAX_GUESSES + 1 - row.wordle.guesses : 0;
  return wordle + (row.word_wheel?.right ?? 0) + (row.sprint?.score ?? 0);
}

export function sortFriendsToday(rows: readonly FriendToday[]): FriendToday[] {
  return [...rows].sort(
    (a, b) => todayPoints(b) - todayPoints(a) || a.display_name.localeCompare(b.display_name)
  );
}

/** "Wordle 4/6", "Word Wheel 18/23", "der·die·das 23", each with the level it was played at. */
export function todayResults(row: FriendToday, language: TargetLanguage): { label: string; level: string }[] {
  const results: { label: string; level: string }[] = [];
  if (row.wordle) {
    const score = row.wordle.won ? row.wordle.guesses : "X";
    results.push({ label: `Wordle ${score}/${WORDLE_MAX_GUESSES}`, level: row.wordle.level });
  }
  if (row.word_wheel) {
    results.push({ label: `Word Wheel ${row.word_wheel.right}/${row.word_wheel.total}`, level: row.word_wheel.level });
  }
  if (row.sprint) {
    results.push({ label: `${ARTICLE_GAME_NAME[language]} ${row.sprint.score}`, level: row.sprint.level });
  }
  return results;
}

export async function loadFriendsToday(
  supabase: SupabaseClient,
  language: TargetLanguage
): Promise<FriendToday[]> {
  const { data, error } = await supabase.rpc("get_friends_today", { p_language: language });
  return error || !Array.isArray(data) ? [] : sortFriendsToday(data as FriendToday[]);
}
