"use server";

import { getAuthUserId } from "@/lib/auth";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import {
  addDays,
  isPlayableDate,
  italyToday,
  puzzleNumber,
  scoreGuess,
  WORDLE_ARCHIVE_DAYS,
  WORDLE_FIRST_DAY,
  WORDLE_LENGTH,
  type WordleMark,
} from "@/lib/wordle";
import { createAdminClient } from "@/utils/supabase/admin";

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

export type WordleResult =
  | { ok: true; view: WordleView; archive: WordleArchiveDay[] }
  | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  not_a_word: "Not in the word list.",
  already_finished: "You already played this puzzle.",
  no_words_for_level: "No words for this level yet.",
};

/**
 * Loads a puzzle (today when date is null) or plays one guess on it. Answers
 * live only in the database and are read with the service role.
 */
async function play(level: string, date: string | null, guess: string | null): Promise<WordleResult> {
  const userId = await getAuthUserId();
  if (!userId) {
    return { ok: false, error: "Sign in to play." };
  }

  const today = italyToday();
  const day = date ?? today;
  if (!PROFICIENCY_LEVELS.includes(level as (typeof PROFICIENCY_LEVELS)[number]) || !isPlayableDate(day, today)) {
    return { ok: false, error: "This puzzle does not exist." };
  }

  const word = guess?.trim().toLowerCase() ?? null;
  if (word !== null && !new RegExp(`^[a-z]{${WORDLE_LENGTH}}$`).test(word)) {
    return { ok: false, error: `Type a ${WORDLE_LENGTH}-letter word.` };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("wordle_play", {
    p_user_id: userId,
    p_level: level,
    p_date: day,
    p_guess: word,
  });

  if (error || !data?.[0]) {
    const known = Object.keys(ERRORS).find((key) => error?.message.includes(key));
    return { ok: false, error: known ? ERRORS[known] : "Could not load the puzzle. Try again." };
  }

  const game = data[0];
  const finished = game.status !== "playing";
  const view: WordleView = {
    level,
    date: day,
    number: puzzleNumber(day),
    isToday: day === today,
    guesses: game.guesses.map((guessed) => ({ word: guessed, marks: scoreGuess(guessed, game.answer) })),
    status: game.status,
    answer: finished ? game.answer : null,
    meaning: finished ? game.meaning : null,
  };

  const from = [addDays(today, -WORDLE_ARCHIVE_DAYS), WORDLE_FIRST_DAY].sort().at(-1)!;
  const { data: history } = await admin.rpc("wordle_history", {
    p_user_id: userId,
    p_level: level,
    p_from: from,
  });
  const statusByDay = new Map((history ?? []).map((row) => [row.puzzle_date, row.status]));

  const archive: WordleArchiveDay[] = [];
  for (let past = addDays(today, -1); past >= from; past = addDays(past, -1)) {
    archive.push({ date: past, number: puzzleNumber(past), status: statusByDay.get(past) ?? null });
  }

  return { ok: true, view, archive };
}

export async function loadWordle(level: string, date: string | null): Promise<WordleResult> {
  return play(level, date, null);
}

export async function guessWordle(level: string, date: string, guess: string): Promise<WordleResult> {
  return play(level, date, guess);
}
