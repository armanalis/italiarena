/** Daily Italian Wordle: puzzle dates and game state (shared by server and browser). */
import type { SupabaseClient } from "@supabase/supabase-js";

export const WORDLE_LENGTH = 5;
/** KEEP IN SYNC with wordle_play (supabase/wordle-2026-10-10.sql). */
export const WORDLE_MAX_GUESSES = 6;
/** Puzzle #1. */
export const WORDLE_FIRST_DAY = "2026-10-10";
/** How many past days the archive lists. */
export const WORDLE_ARCHIVE_DAYS = 30;

export type WordleMark = "correct" | "present" | "absent";

const DAY_MS = 86_400_000;

/** Today's puzzle date: puzzles change at midnight Italy time for everyone. */
export function italyToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function puzzleNumber(date: string): number {
  return (
    Math.round(
      (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${WORDLE_FIRST_DAY}T00:00:00Z`)) / DAY_MS
    ) + 1
  );
}

const MARK_RANK: Record<WordleMark, number> = { absent: 0, present: 1, correct: 2 };

/** Best mark seen so far for each letter, for the on-screen keyboard. */
export function keyboardMarks(
  guesses: { word: string; marks: WordleMark[] }[]
): Record<string, WordleMark> {
  const best: Record<string, WordleMark> = {};
  for (const { word, marks } of guesses) {
    [...word].forEach((letter, index) => {
      const mark = marks[index];
      if (!best[letter] || MARK_RANK[mark] > MARK_RANK[best[letter]]) {
        best[letter] = mark;
      }
    });
  }
  return best;
}

export type WordleStatus = "playing" | "won" | "lost";

export type WordleView = {
  level: string;
  date: string;
  number: number;
  isToday: boolean;
  guesses: { word: string; marks: WordleMark[] }[];
  status: WordleStatus;
  /** Only once the game is over. */
  answer: string | null;
  meaning: string | null;
};

export type WordleArchiveDay = {
  date: string;
  number: number;
  status: WordleStatus | null;
};

/** What wordle_turn returns (supabase/wordle-fast-2026-10-10.sql). */
type WordleTurn = {
  today: string;
  guesses: string[];
  marks: string[];
  status: WordleStatus;
  answer: string | null;
  meaning: string | null;
  history: Record<string, WordleStatus> | null;
};

const MARK_CODES: Record<string, WordleMark> = { c: "correct", p: "present", a: "absent" };

export function toWordleView(level: string, date: string, turn: WordleTurn): WordleView {
  return {
    level,
    date,
    number: puzzleNumber(date),
    isToday: date === turn.today,
    guesses: turn.guesses.map((word, index) => ({
      word,
      marks: [...(turn.marks[index] ?? "")].map((code) => MARK_CODES[code] ?? "absent"),
    })),
    status: turn.status,
    answer: turn.answer,
    meaning: turn.meaning,
  };
}

/** The last WORDLE_ARCHIVE_DAYS days before today, newest first. */
export function toWordleArchive(
  today: string,
  history: Record<string, WordleStatus>
): WordleArchiveDay[] {
  const from = [addDays(today, -WORDLE_ARCHIVE_DAYS), WORDLE_FIRST_DAY].sort().at(-1)!;
  const days: WordleArchiveDay[] = [];
  for (let day = addDays(today, -1); day >= from; day = addDays(day, -1)) {
    days.push({ date: day, number: puzzleNumber(day), status: history[day] ?? null });
  }
  return days;
}

const ERRORS: Record<string, string> = {
  not_a_word: "Not in the word list.",
  already_finished: "You already played this puzzle.",
  no_such_puzzle: "This puzzle does not exist.",
  no_words_for_level: "No words for this level yet.",
};

export function wordleErrorMessage(message: string | undefined): string {
  const known = Object.keys(ERRORS).find((code) => message?.includes(code));
  return known ? ERRORS[known] : "Could not reach the puzzle. Try again.";
}

/**
 * Loads a puzzle (guess null, with the archive) or plays one guess, straight
 * against the database: one round trip. Works with the browser and the
 * server Supabase client alike.
 */
export type WordleTurnResult =
  | { ok: true; today: string; view: WordleView; archive: WordleArchiveDay[] | null }
  | { ok: false; error: string };

export async function playWordle(
  supabase: SupabaseClient,
  level: string,
  date: string,
  guess: string | null
): Promise<WordleTurnResult> {
  const { data, error } = await supabase.rpc("wordle_turn", {
    p_level: level,
    p_date: date,
    p_guess: guess,
  });
  if (error || !data) {
    return { ok: false, error: wordleErrorMessage(error?.message) };
  }
  const turn = data as WordleTurn;
  return {
    ok: true,
    today: turn.today,
    view: toWordleView(level, date, turn),
    archive: turn.history ? toWordleArchive(turn.today, turn.history) : null,
  };
}
