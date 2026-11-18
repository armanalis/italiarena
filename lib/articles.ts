/**
 * The article game: der·die·das (German), il·lo·la (Italian). Rules shared by
 * the Sprint page, the noun bank builder (tmp/articles/build.ts) and tests
 * (scripts/test-articles.ts). Scoring runs in the database: article_sprint_finish.
 */
import { pickLocalized, translator, type Translate, type UiLanguage } from "@/lib/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LANGUAGE_META, type TargetLanguage } from "@/lib/constants";
import { knownError, type Result } from "@/lib/errors";
import { PREPOSITION_GAME_NAME } from "@/lib/prepositions";
import { addDays } from "@/lib/wordle";
import type { CorrectAnswer, QuestionActive, QuestionLevel } from "@/types/database.types";

/** KEEP IN SYNC with article_sprint_start / article_sprint_finish (supabase/migrations/*_article_game.sql). */
export const SPRINT_MS = 60_000;
/** Every BONUS_EVERY right answers in a row add the sprint's bonusMs (5 s for articles when the server omits it). */
export const BONUS_EVERY = 5;
/** How many past days the archive lists. Same window as Wordle. */
export const SPRINT_ARCHIVE_DAYS = 30;
const DEFAULT_BONUS_MS = 5_000;

/** The game is named after its buttons. English has none: hide it with hasArticleGame. */
export const ARTICLE_GAME_NAME = {
  German: "der·die·das",
  Italian: "il·lo·la",
} as const;

export type ArticleLanguage = keyof typeof ARTICLE_GAME_NAME;

export function hasArticleGame(language: string): language is ArticleLanguage {
  return Object.prototype.hasOwnProperty.call(ARTICLE_GAME_NAME, language);
}

export type SprintKind = "article" | "preposition" | "indefinite";

/** un·uno·una. Italian only. The name is the buttons, in every app language. */
export const INDEFINITE_GAME_NAME = "un·uno·una";

export const INDEFINITE_CHOICES = ["un", "uno", "una", "un'"] as const;

export function hasIndefiniteGame(language: string): boolean {
  return language === "Italian";
}

/**
 * meaningTr / meaningIt: the meaning in that app language, null where the bank has none yet.
 * A preposition card has no meaning: noun is the sentence (___ is the blank),
 * article is the right button, choices are its buttons, rule is a rule id.
 */
export type ArticleCard = {
  id: number;
  noun: string;
  article: string;
  meaning: string | null;
  meaningTr?: string | null;
  meaningIt?: string | null;
  choices?: string[] | null;
  rule?: string | null;
};

const GERMAN = ["der", "die", "das"];
const ITALIAN = ["il", "lo", "la", "l'"];
const ITALIAN_PLURAL = ["i", "gli", "le"];

/** Every article of a language, in button order (Stats lists accuracy per article). */
export const ALL_ARTICLES: Record<ArticleLanguage, readonly string[]> = {
  German: GERMAN,
  Italian: [...ITALIAN, ...ITALIAN_PLURAL],
};

/** A card's buttons, in order (A, B, C, D in Mistakes). KEEP IN SYNC with article_choices. */
export function articleChoices(language: ArticleLanguage, article: string): readonly string[] {
  if (language === "German") return GERMAN;
  return ITALIAN_PLURAL.includes(article) ? ITALIAN_PLURAL : ITALIAN;
}

/** "die Zeitung", "l'amico". */
export function withArticle(article: string, noun: string): string {
  return article.endsWith("'") ? `${article}${noun}` : `${article} ${noun}`;
}

/** "Vado ___università" + "all'" → "Vado all'università". "in den" keeps the space around the blank. */
export function fillPreposition(sentence: string, button: string): string {
  const elided = /['’]$/.test(button);
  return sentence.replace(elided ? /___\s*/ : /___/, button);
}

/** The clock's extra time after this answer: bonusMs each time a streak of right answers reaches 5, 10, 15… */
export function bonusAfter(streak: number, bonusMs = DEFAULT_BONUS_MS): number {
  return streak > 0 && streak % BONUS_EVERY === 0 ? bonusMs : 0;
}

const VOWEL = /^[aeiouàèéìíòóùú]/i;
// lo/gli: s + consonant, z, gn, ps, x (lo studente, lo zaino, lo gnomo, lo psicologo, lo xilofono).
const LO_SOUND = /^(s[^aeiouàèéìíòóùú]|z|gn|ps|x)/i;
// uno: the same sounds as lo, plus y (uno yogurt). uno studente, uno zaino, uno gnomo, uno psicologo, uno xilofono.
const UNO_SOUND = /^(s[^aeiouàèéìíòóùú]|z|gn|ps|x|y)/i;
// Usage is split or the sound is hidden (il/lo pneumatico, l'hotel, lo/il whisky, lo iato): left out of the game.
const UNCLEAR_SOUND = /^(h|w|y|j|k|pn|i[aeiou])/i;
// y takes uno, so it stays in the indefinite game. The rest match UNCLEAR_SOUND.
const INDEFINITE_UNCLEAR = /^(h|w|j|k|pn|i[aeiou])/i;

/**
 * The Italian article a noun takes, from its gender and first letters; null
 * when the first sound makes usage unclear.
 */
export function italianArticle(noun: string, gender: "m" | "f", plural: boolean): string | null {
  if (UNCLEAR_SOUND.test(noun)) return null;
  if (gender === "f") return plural ? "le" : VOWEL.test(noun) ? "l'" : "la";
  if (plural) return VOWEL.test(noun) || LO_SOUND.test(noun) ? "gli" : "i";
  return VOWEL.test(noun) ? "l'" : LO_SOUND.test(noun) ? "lo" : "il";
}

/**
 * The Italian indefinite article, from gender and first letters; null when the
 * first sound makes usage unclear. un libro, un amico, uno studente, una casa, un'amica.
 */
export function italianIndefinite(noun: string, gender: "m" | "f"): string | null {
  if (INDEFINITE_UNCLEAR.test(noun)) return null;
  if (gender === "f") return VOWEL.test(noun) ? "un'" : "una";
  return UNO_SOUND.test(noun) ? "uno" : "un";
}

export const INDEFINITE_RULES: Record<string, string> = {
  un: "un: masculine, before a consonant or a vowel (un libro, un amico)",
  uno: "uno: masculine, before s + consonant, z, gn, ps, x, y (uno studente, uno zaino, uno yogurt)",
  una: "una: feminine, before a consonant (una casa, una stazione)",
  "un'": "un': feminine, before a vowel (un'amica, un'ora)",
};

const ITALIAN_RULES: Record<string, string> = {
  il: "il: masculine, before most consonants (il libro)",
  lo: "lo: masculine, before s + consonant, z, gn, ps (lo studente, lo zaino)",
  "l'": "l': before a vowel, masculine or feminine (l'amico, l'acqua)",
  la: "la: feminine, before a consonant (la casa)",
  i: "i: masculine plural, before most consonants (i libri)",
  gli: "gli: masculine plural, before a vowel, s + consonant, z… (gli amici, gli studenti)",
  le: "le: every feminine plural (le case, le amiche)",
};

// Endings that give away a German noun's gender. A rule is only shown for a
// noun that follows it, so "usually" rules never mislead (der Kuchen gets none).
const GERMAN_RULES: { endings: string[]; article: string; text: string }[] = [
  { endings: ["ung"], article: "die", text: "-ung words are always die" },
  { endings: ["heit", "keit"], article: "die", text: "-heit and -keit words are always die" },
  { endings: ["schaft"], article: "die", text: "-schaft words are always die" },
  { endings: ["tät"], article: "die", text: "-tät words are always die" },
  { endings: ["ion"], article: "die", text: "-ion words are almost always die" },
  { endings: ["ik"], article: "die", text: "-ik words are usually die" },
  { endings: ["enz", "anz"], article: "die", text: "-enz and -anz words are die" },
  { endings: ["ei"], article: "die", text: "-ei words are usually die" },
  { endings: ["ur"], article: "die", text: "-ur words are usually die" },
  { endings: ["e"], article: "die", text: "Most words ending in -e are die" },
  { endings: ["chen", "lein"], article: "das", text: "-chen and -lein (little things) are always das" },
  { endings: ["ment"], article: "das", text: "-ment words are usually das" },
  { endings: ["um"], article: "das", text: "-um words are usually das" },
  { endings: ["o"], article: "das", text: "-o words are usually das" },
  { endings: ["ling"], article: "der", text: "-ling words are der" },
  { endings: ["ismus"], article: "der", text: "-ismus words are always der" },
  { endings: ["or"], article: "der", text: "-or words are usually der" },
];

/** The one-line rule shown after a wrong answer; null when no rule explains this noun. */
export function articleRule(language: ArticleLanguage, noun: string, article: string): string | null {
  if (language === "Italian") return ITALIAN_RULES[article] ?? null;
  const word = noun.toLowerCase();
  const rule = GERMAN_RULES.find(({ endings }) => endings.some((ending) => word.endsWith(ending)));
  return rule?.article === article ? rule.text : null;
}

/** Mistakes ids for missed nouns ("noun:42"); quiz questions keep their uuid. */
export const NOUN_QUESTION_PREFIX = "noun:";

export type ArticleNoun = {
  id: number;
  language: TargetLanguage;
  level: string;
  noun: string;
  article: string;
  meaning: string | null;
  meaning_tr?: string | null;
  meaning_it?: string | null;
  kind?: SprintKind;
  choices?: string[] | null;
  rule?: string | null;
};

/**
 * A missed noun as a Mistakes question, so the list and practice screens
 * work unchanged: its buttons are options A–D (D empty for 3 buttons).
 * KEEP IN SYNC with the letters article_sprint_finish saves.
 */
export function nounQuestion(noun: ArticleNoun, t: Translate = translator(null), language: UiLanguage = "en"): QuestionActive {
  const choices =
    noun.kind === "preposition"
      ? (noun.choices ?? [])
      : noun.kind === "indefinite"
        ? [...(noun.choices?.length ? noun.choices : INDEFINITE_CHOICES)]
        : hasArticleGame(noun.language)
          ? [...articleChoices(noun.language, noun.article)]
          : [];
  if (noun.kind !== "preposition" && noun.kind !== "indefinite" && !hasArticleGame(noun.language)) {
    throw new Error(`No article game for ${noun.language}.`);
  }
  const [a = "", b = "", c = "", d = ""] = choices;
  return {
    id: `${NOUN_QUESTION_PREFIX}${noun.id}`,
    language: noun.language,
    level: noun.level as QuestionLevel,
    category: "grammar",
    question_text:
      noun.kind === "preposition"
        ? noun.noun
        : t("Which article? {noun} ({meaning})", {
            noun: noun.noun,
            meaning: pickLocalized(language, noun.meaning ?? "", { tr: noun.meaning_tr, it: noun.meaning_it }),
          }),
    option_a: a,
    option_b: b,
    option_c: c,
    option_d: d,
    correct_answer: "ABCD"[choices.indexOf(noun.article)] as CorrectAnswer,
    random_float: 0,
    rule: noun.kind === "preposition" ? noun.rule ?? null : noun.kind === "indefinite" ? noun.article : null,
  };
}

export function articleShareText(
  language: TargetLanguage,
  level: string,
  score: number,
  origin: string,
  kind: SprintKind = "article",
  date?: string
): string {
  const name =
    kind === "preposition"
      ? PREPOSITION_GAME_NAME[language]
      : kind === "indefinite"
        ? INDEFINITE_GAME_NAME
        : ARTICLE_GAME_NAME[language as ArticleLanguage];
  const path = kind === "preposition" ? "prepositions" : kind === "indefinite" ? "indefinite-articles" : "articles";
  const day = date ? `&day=${date}` : "";
  return [
    date ? `Italiarena ${name} ${score} · ${level} · ${date}` : `Italiarena ${name} ${score} · ${level}`,
    `${origin}/${path}?lang=${LANGUAGE_META[language].code}&level=${level}${day}`,
  ].join("\n");
}

export type SprintStart = {
  runId: number;
  scored: boolean;
  msLeft: number;
  /** The Sprint's full length. Older replies omit it; the article game is 60 s. */
  ms?: number;
  /** Added to the clock every 5 right in a row. Older replies omit it; articles are 1 s. */
  bonusMs?: number;
  /** The day this Sprint belongs to. Older replies omit it. */
  date?: string;
  kind?: SprintKind;
  cards: ArticleCard[];
};

export type SprintHistory = { today: string; days: Record<string, number> };

export type SprintArchiveDay = { date: string; score: number | null };

/** The last SPRINT_ARCHIVE_DAYS days before today, newest first. A day missing from `days` was not played. */
export function toSprintArchive(today: string, days: Record<string, number>): SprintArchiveDay[] {
  const archive: SprintArchiveDay[] = [];
  for (let ago = 1; ago <= SPRINT_ARCHIVE_DAYS; ago += 1) {
    const date = addDays(today, -ago);
    const score = days[date];
    archive.push({ date, score: typeof score === "number" ? score : null });
  }
  return archive;
}
export type SprintResult = { score: number; rejected: boolean; best: number | null };
export type ArticleStats = {
  best: Record<string, number>;
  today: Record<string, number>;
  accuracy: Record<string, { answered: number; right: number }>;
};

const ERRORS: Record<string, string> = {
  no_nouns: "No nouns for this level yet.",
  no_such_run: "This Sprint already ended.",
  no_such_level: "This level does not exist.",
  no_such_day: "That day is not in the archive.",
  already_played: "You already played this Sprint.",
};

const errorMessage = (message?: string) => knownError(ERRORS, message, "Could not reach the game. Try again.");

export async function startSprint(
  supabase: SupabaseClient,
  language: TargetLanguage,
  level: string,
  kind: SprintKind = "article",
  date: string | null = null
): Promise<Result<SprintStart>> {
  const { data, error } = await supabase.rpc("article_sprint_start", {
    p_language: language,
    p_level: level,
    p_kind: kind,
    p_date: date,
  });
  return error || !data ? { ok: false, error: errorMessage(error?.message) } : { ok: true, value: data as SprintStart };
}

/** Scores for the archive. Null when the call fails (the game still plays today). */
export async function loadSprintHistory(
  supabase: SupabaseClient,
  language: TargetLanguage,
  level: string,
  kind: SprintKind = "article"
): Promise<SprintHistory | null> {
  const { data, error } = await supabase.rpc("article_history", {
    p_language: language,
    p_level: level,
    p_kind: kind,
  });
  if (error || !data || typeof data !== "object") return null;
  const row = data as { today?: unknown; days?: unknown };
  if (typeof row.today !== "string" || !row.days || typeof row.days !== "object") return null;
  const days: Record<string, number> = {};
  for (const [date, score] of Object.entries(row.days)) {
    if (typeof score === "number") days[date] = score;
  }
  return { today: row.today, days };
}

/** A finish that has not answered by then is a failure the player can retry. */
const FINISH_TIMEOUT_MS = 20_000;

/**
 * Checkpoint of in-progress answers. A finish that arrives after the clock
 * scores the last save instead of 0. Late or failed saves are ignored.
 */
export function saveSprint(supabase: SupabaseClient, runId: number, answers: string[]): void {
  void Promise.resolve(supabase.rpc("article_sprint_save", { p_run_id: runId, p_answers: answers })).then(
    () => undefined,
    () => undefined
  );
}

/** `answers[i]` is the article picked for card i. */
export async function finishSprint(
  supabase: SupabaseClient,
  runId: number,
  answers: string[]
): Promise<Result<SprintResult>> {
  try {
    const { data, error } = await supabase
      .rpc("article_sprint_finish", {
        p_run_id: runId,
        p_answers: answers,
      })
      .abortSignal(AbortSignal.timeout(FINISH_TIMEOUT_MS));
    return error || !data ? { ok: false, error: errorMessage(error?.message) } : { ok: true, value: data as SprintResult };
  } catch {
    return { ok: false, error: errorMessage() };
  }
}

export async function loadArticleStats(
  supabase: SupabaseClient,
  language: TargetLanguage,
  kind: SprintKind = "article"
): Promise<ArticleStats | null> {
  const { data, error } = await supabase.rpc("article_stats", { p_language: language, p_kind: kind });
  return error || !data ? null : (data as ArticleStats);
}
