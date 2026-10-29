/** Daily Italian Passaparola: a clue for every letter, 5 minutes on the clock. */
import type { SupabaseClient } from "@supabase/supabase-js";

/** The Italian alphabet: J, K, W, X and Y only appear in foreign words. */
export const PASSAPAROLA_LETTERS = [..."ABCDEFGHILMNOPQRSTUVZ"];

/**
 * Typed instead of an answer: pass the letter, or end the game early.
 * KEEP IN SYNC with the check in supabase/passaparola-questions-2026-10-12.sql
 * (no clue may have these as answers).
 */
export const PASSAPAROLA_PASS_WORD = "passo";
export const PASSAPAROLA_FINISH_WORD = "basta";

export type PassaparolaMark = "right" | "wrong";

export type PassaparolaView = {
  /** One of PROFICIENCY_LEVELS: each level has its own board and clues. */
  level: string;
  date: string;
  started: boolean;
  finished: boolean;
  msLeft: number;
  /** Empty until the clock starts. */
  clues: { letter: string; clue: string }[];
  /** Letters not here are still to play. */
  marks: Record<string, PassaparolaMark>;
  /** What the player typed for each answered letter (games before 2026-10-13 have none). */
  given: Record<string, string>;
  /** Only once the game is over. */
  answers: Record<string, string[]> | null;
};

export type PassaparolaTurnResult =
  | { ok: true; view: PassaparolaView }
  | { ok: false; error: string };

/**
 * The next letter still to play after `after`, in alphabet order and round
 * again: a passed letter comes back only once every letter after it has been
 * played. Null when none is left.
 */
export function nextLetter(
  letters: string[],
  marks: Record<string, PassaparolaMark>,
  after: string | null
): string | null {
  const start = after ? letters.indexOf(after) + 1 : 0;
  for (let step = 0; step < letters.length; step += 1) {
    const letter = letters[(start + step) % letters.length];
    if (!marks[letter]) {
      return letter;
    }
  }
  return null;
}

/**
 * Whether what is typed can still become an answer for `letter` (every answer
 * starts with its letter, accents aside) or one of the two command words.
 */
export function fitsLetter(typed: string, letter: string): boolean {
  const word = typed.trimStart().toLowerCase();
  return (
    word.normalize("NFD").startsWith(letter.toLowerCase()) ||
    PASSAPAROLA_PASS_WORD.startsWith(word) ||
    PASSAPAROLA_FINISH_WORD.startsWith(word)
  );
}

const ERRORS: Record<string, string> = {
  no_such_board: "This board does not exist.",
  no_questions: "No clues for this level yet.",
  not_started: "Start the game first.",
  no_such_letter: "That letter is not on this board.",
};

function errorMessage(message: string | undefined): string {
  const known = Object.keys(ERRORS).find((code) => message?.includes(code));
  return known ? ERRORS[known] : "Could not reach the board. Try again.";
}

/**
 * Loads today's board (no move), starts its clock, answers one letter, or ends the game,
 * straight against the database: one round trip. Works with the browser and
 * the server Supabase client alike.
 */
export async function playPassaparola(
  supabase: SupabaseClient,
  level: string,
  move: { date?: string; start?: boolean; letter?: string; answer?: string; finish?: boolean } = {}
): Promise<PassaparolaTurnResult> {
  const { data, error } = await supabase.rpc("passaparola_turn", {
    p_tier: level,
    p_date: move.date ?? null,
    p_start: move.start ?? false,
    p_letter: move.letter ?? null,
    p_answer: move.answer ?? null,
    p_finish: move.finish ?? false,
  });
  if (error || !data) {
    return { ok: false, error: errorMessage(error?.message) };
  }
  const view = data as Omit<PassaparolaView, "level" | "given"> & Partial<Pick<PassaparolaView, "given">>;
  // `given` is missing until the SQL that adds it has run.
  return { ok: true, view: { level, ...view, given: view.given ?? {} } };
}
