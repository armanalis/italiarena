/** Word Wheel (Passaparola in the code and database): a clue for every letter, 5 minutes on the clock. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { LANGUAGE_META, type KnownLanguage, type TargetLanguage } from "@/lib/constants";
import { knownError } from "@/lib/errors";
import { addDays } from "@/lib/wordle";

/**
 * The wheel's letters. Italian: J, K, W, X and Y only appear in foreign words.
 * German: too few words start with Q, X or Y; Ä, Ö and Ü count as A, O and U.
 * English: too few words start with X.
 * Spanish: no K, W, X or Ñ (ñ counts as N). Danish: no C, Q, W, X, Y or Z.
 * KEEP IN SYNC with the letter check in the passaparola database functions.
 */
export const PASSAPAROLA_LETTERS: Record<KnownLanguage, string[]> = {
  Italian: [..."ABCDEFGHILMNOPQRSTUVZ"],
  German: [..."ABCDEFGHIJKLMNOPRSTUVWZ"],
  English: [..."ABCDEFGHIJKLMNOPQRSTUVWYZ"],
  Spanish: [..."ABCDEFGHIJLMNOPQRSTUVYZ"],
  Danish: [..."ABDEFGHIJKLMNOPRSTUVÆØÅ"],
};

/**
 * Typed instead of an answer: pass the letter, or end the game early.
 * The words are the language being played, and only those (salta in Italian, not skip).
 * KEEP IN SYNC with the clue banks (tmp/passaparola/clues*.tsv): none of these
 * may be an answer in that language.
 */
const PASS_WORD: Record<KnownLanguage, string> = {
  Italian: "salta",
  German: "weiter",
  English: "skip",
  Spanish: "paso",
  Danish: "videre",
};

const FINISH_WORD: Record<KnownLanguage, string> = {
  Italian: "ferma",
  German: "stopp",
  English: "stop",
  Spanish: "basta",
  Danish: "stop",
};

export function passWord(language: KnownLanguage): string {
  return PASS_WORD[language];
}

export function finishWord(language: KnownLanguage): string {
  return FINISH_WORD[language];
}

function commandWords(language: KnownLanguage): string[] {
  return [passWord(language), finishWord(language)];
}

export function isPassCommand(typed: string, language: KnownLanguage): boolean {
  const word = typed.trim().toLowerCase();
  return word === passWord(language);
}

export function isFinishCommand(typed: string, language: KnownLanguage): boolean {
  const word = typed.trim().toLowerCase();
  return word === finishWord(language);
}

export type PassaparolaMark = "right" | "wrong";

/** Normal counts one wrong letter as right. Hard wants the exact word. Read by the server only when the clock starts. */
export type WheelMode = "normal" | "hard";

export type PassaparolaView = {
  /** One of PROFICIENCY_LEVELS: each level has its own board and clues. */
  level: string;
  date: string;
  /** The archive's "today". Older replies omit it. */
  today?: string;
  started: boolean;
  finished: boolean;
  msLeft: number;
  /** Empty until the clock starts. Older replies omit it. */
  mode?: WheelMode;
  /** Empty until the clock starts. */
  clues: { letter: string; clue: string; clueTr?: string | null; clueIt?: string | null }[];
  /** Letters not here are still to play. */
  marks: Record<string, PassaparolaMark>;
  /** What the player typed for each answered letter (games before 2026-10-13 have none). */
  given: Record<string, string>;
  /** Letters counted right with one letter off. Older replies omit it. */
  near: string[];
  /** The accepted spelling of a near letter ("G" → "guida"). Older replies omit it. */
  spelling: Record<string, string>;
  /** Only once the game is over. */
  answers: Record<string, string[]> | null;
  /** The answers of letters marked wrong, shown at once. Older replies omit it. */
  reveal: Record<string, string[]>;
};

/** How many past days the archive lists. Same window as Wordle. */
export const WHEEL_ARCHIVE_DAYS = 30;

export type WheelArchiveDay = {
  date: string;
  right: number | null;
  total: number | null;
  finished: boolean;
  mode: WheelMode | null;
};

type WheelHistoryDay = { right?: number; total?: number; finished?: boolean; mode?: string };

function asMode(value: unknown): WheelMode | undefined {
  return value === "normal" || value === "hard" ? value : undefined;
}

/** The last WHEEL_ARCHIVE_DAYS days before today, newest first. A day missing from `history` was not played. */
export function toWheelArchive(today: string, history: Record<string, WheelHistoryDay>): WheelArchiveDay[] {
  const archive: WheelArchiveDay[] = [];
  for (let ago = 1; ago <= WHEEL_ARCHIVE_DAYS; ago += 1) {
    const date = addDays(today, -ago);
    const row = history[date];
    archive.push(
      row && typeof row.right === "number"
        ? {
            date,
            right: row.right,
            total: typeof row.total === "number" ? row.total : row.right,
            finished: row.finished === true,
            mode: asMode(row.mode) ?? null,
          }
        : { date, right: null, total: null, finished: false, mode: null }
    );
  }
  return archive;
}

/** Score, mode and day, plus a link that opens the same board. */
export function wheelShareText(
  language: TargetLanguage,
  level: string,
  date: string,
  mode: WheelMode | undefined,
  right: number,
  total: number,
  origin: string
): string {
  const modeLabel = mode === "hard" ? "Hard" : mode === "normal" ? "Normal" : null;
  return [
    ["Italiarena Word Wheel " + `${right}/${total}`, language, level, modeLabel, date].filter(Boolean).join(" · "),
    `${origin}/word-wheel?lang=${LANGUAGE_META[language].code}&level=${level}&day=${date}`,
  ].join("\n");
}

export type PassaparolaTurnResult =
  | { ok: true; view: PassaparolaView; archive: WheelArchiveDay[] | null }
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
 * starts with its letter) or one of the two command words.
 * KEEP IN SYNC with passaparola_normalize: Spanish áéíóúüñ → aeiouun;
 * Danish æ = ae, ø = oe, å = aa. A short prefix of a digraph still fits
 * ("a" on A, Æ and Å) until the word decides ("abe" is A, "aeble" is Æ).
 */
export function fitsLetter(typed: string, letter: string, language: KnownLanguage = "English"): boolean {
  const word = typed.trimStart().toLowerCase();
  if (commandWords(language).some((command) => command.startsWith(word))) return true;
  const folded = foldForLetter(word, language);
  const head = foldForLetter(letter.toLowerCase(), language);
  if (!folded || head.startsWith(folded)) return true;
  return folded.startsWith(head) && decidedLetter(folded, language) === letter.toLowerCase();
}

/** Spanish accents and ñ, Danish æ/ø/å, and the NFD fold German and Italian already use. */
function foldForLetter(word: string, language: KnownLanguage): string {
  if (language === "Spanish") {
    const composed = word.normalize("NFC");
    return [...composed].map((ch) => {
      const at = "áéíóúüñ".indexOf(ch);
      return at === -1 ? ch : "aeiouun"[at];
    }).join("");
  }
  if (language === "Danish") return word.replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa");
  return word.normalize("NFD").replace(/\p{M}/gu, "");
}

function decidedLetter(folded: string, language: KnownLanguage): string {
  if (language === "Danish") {
    if (folded.startsWith("ae")) return "æ";
    if (folded.startsWith("oe")) return "ø";
    if (folded.startsWith("aa")) return "å";
  }
  return folded[0] ?? "";
}

const ERRORS: Record<string, string> = {
  no_such_board: "This board does not exist.",
  no_questions: "No clues for this level yet.",
  not_started: "Start the game first.",
  no_such_letter: "That letter is not on this board.",
};

/**
 * Loads today's board (no move), starts its clock, answers one letter, or ends the game,
 * straight against the database: one round trip. Works with the browser and
 * the server Supabase client alike.
 */
export async function playPassaparola(
  supabase: SupabaseClient,
  language: TargetLanguage,
  level: string,
  move: { date?: string; start?: boolean; letter?: string; answer?: string; finish?: boolean; mode?: WheelMode } = {}
): Promise<PassaparolaTurnResult> {
  const { data, error } = await supabase.rpc("passaparola_turn", {
    p_tier: level,
    p_date: move.date ?? null,
    p_start: move.start ?? false,
    p_letter: move.letter ?? null,
    p_answer: move.answer ?? null,
    p_finish: move.finish ?? false,
    p_language: language,
    // The server reads the mode only when the clock starts. Always send it then.
    p_mode: move.start ? (move.mode ?? "normal") : null,
  });
  if (error || !data) {
    return { ok: false, error: knownError(ERRORS, error?.message, "Could not reach the board. Try again.") };
  }
  const row = data as Omit<PassaparolaView, "level" | "given" | "near" | "spelling" | "mode" | "reveal"> &
    Partial<Pick<PassaparolaView, "given" | "near" | "spelling" | "mode" | "today" | "reveal">> & {
      history?: Record<string, WheelHistoryDay> | null;
    };
  const spelling =
    row.spelling && typeof row.spelling === "object"
      ? Object.fromEntries(Object.entries(row.spelling).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
      : {};
  const view: PassaparolaView = {
    level,
    date: row.date,
    today: row.today,
    started: row.started,
    finished: row.finished,
    msLeft: row.msLeft,
    mode: asMode(row.mode),
    clues: row.clues ?? [],
    marks: row.marks ?? {},
    given: row.given ?? {},
    near: Array.isArray(row.near) ? row.near.filter((letter): letter is string => typeof letter === "string") : [],
    spelling,
    answers: row.answers ?? null,
    reveal: row.reveal && typeof row.reveal === "object" ? row.reveal : {},
  };
  // history arrives on a load only. A move keeps the archive the screen already has.
  return { ok: true, view, archive: row.today && row.history ? toWheelArchive(row.today, row.history) : null };
}
