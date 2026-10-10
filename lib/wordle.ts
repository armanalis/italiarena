/** Daily Italian Wordle: scoring and puzzle dates (shared by server and browser). */

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

/** A real calendar day from puzzle #1 up to today (no future puzzles). */
export function isPlayableDate(date: string, today: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    addDays(date, 0) === date &&
    date >= WORDLE_FIRST_DAY &&
    date <= today
  );
}

/**
 * Green for the right letter in the right place, yellow for a letter that is
 * elsewhere in the word. A repeated letter is yellow only as many times as
 * the answer still has it.
 */
export function scoreGuess(guess: string, answer: string): WordleMark[] {
  const marks: WordleMark[] = Array.from({ length: guess.length }, () => "absent");
  const unmatched = new Map<string, number>();

  for (let index = 0; index < guess.length; index += 1) {
    if (guess[index] === answer[index]) {
      marks[index] = "correct";
    } else {
      unmatched.set(answer[index], (unmatched.get(answer[index]) ?? 0) + 1);
    }
  }

  for (let index = 0; index < guess.length; index += 1) {
    const left = unmatched.get(guess[index]) ?? 0;
    if (marks[index] !== "correct" && left > 0) {
      marks[index] = "present";
      unmatched.set(guess[index], left - 1);
    }
  }

  return marks;
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
