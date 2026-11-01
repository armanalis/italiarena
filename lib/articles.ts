/**
 * The article game: der·die·das (German), il·lo·la (Italian). Rules shared by
 * the Sprint page, the noun bank builder (tmp/articles/build.ts) and tests
 * (scripts/test-articles.ts). Scoring runs in the database: article_sprint_finish.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { LANGUAGE_META, type TargetLanguage } from "@/lib/constants";
import type { CorrectAnswer, QuestionActive, QuestionLevel } from "@/types/database.types";

/** KEEP IN SYNC with article_sprint_start / article_sprint_finish (supabase/migrations/*_article_game.sql). */
export const SPRINT_MS = 60_000;
/** Every BONUS_EVERY right answers in a row add BONUS_MS to the clock. */
export const BONUS_EVERY = 5;
export const BONUS_MS = 1_000;

/** The game is named after its buttons. */
export const ARTICLE_GAME_NAME: Record<TargetLanguage, string> = {
  German: "der·die·das",
  Italian: "il·lo·la",
};

export type ArticleCard = { id: number; noun: string; article: string; meaning: string };

const GERMAN = ["der", "die", "das"];
const ITALIAN = ["il", "lo", "la", "l'"];
const ITALIAN_PLURAL = ["i", "gli", "le"];

/** Every article of a language, in button order (Stats lists accuracy per article). */
export const ALL_ARTICLES: Record<TargetLanguage, readonly string[]> = {
  German: GERMAN,
  Italian: [...ITALIAN, ...ITALIAN_PLURAL],
};

/** A card's buttons, in order (A, B, C, D in Mistakes). KEEP IN SYNC with article_choices. */
export function articleChoices(language: TargetLanguage, article: string): readonly string[] {
  if (language === "German") return GERMAN;
  return ITALIAN_PLURAL.includes(article) ? ITALIAN_PLURAL : ITALIAN;
}

/** "die Zeitung", "l'amico". */
export function withArticle(article: string, noun: string): string {
  return article.endsWith("'") ? `${article}${noun}` : `${article} ${noun}`;
}

/** The clock's extra time after this answer: a second each time a streak of right answers reaches 5, 10, 15… */
export function bonusAfter(streak: number): number {
  return streak > 0 && streak % BONUS_EVERY === 0 ? BONUS_MS : 0;
}

const VOWEL = /^[aeiouàèéìíòóùú]/i;
// lo/gli: s + consonant, z, gn, ps, x (lo studente, lo zaino, lo gnomo, lo psicologo, lo xilofono).
const LO_SOUND = /^(s[^aeiouàèéìíòóùú]|z|gn|ps|x)/i;
// Usage is split or the sound is hidden (il/lo pneumatico, l'hotel, lo/il whisky, lo iato): left out of the game.
const UNCLEAR_SOUND = /^(h|w|y|j|k|pn|i[aeiou])/i;

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
export function articleRule(language: TargetLanguage, noun: string, article: string): string | null {
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
  meaning: string;
};

/**
 * A missed noun as a Mistakes question, so the list and practice screens
 * work unchanged: its buttons are options A–D (D empty for 3 buttons).
 * KEEP IN SYNC with the letters article_sprint_finish saves.
 */
export function nounQuestion(noun: ArticleNoun): QuestionActive {
  const choices = articleChoices(noun.language, noun.article);
  const [a = "", b = "", c = "", d = ""] = choices;
  return {
    id: `${NOUN_QUESTION_PREFIX}${noun.id}`,
    language: noun.language,
    level: noun.level as QuestionLevel,
    category: "grammar",
    question_text: `Which article? ${noun.noun} (${noun.meaning})`,
    option_a: a,
    option_b: b,
    option_c: c,
    option_d: d,
    correct_answer: "ABCD"[choices.indexOf(noun.article)] as CorrectAnswer,
    random_float: 0,
  };
}

export function articleShareText(
  language: TargetLanguage,
  level: string,
  score: number,
  origin: string
): string {
  return [
    `Italiarena ${ARTICLE_GAME_NAME[language]} ${score} · ${level}`,
    `${origin}/articles?lang=${LANGUAGE_META[language].code}&level=${level}`,
  ].join("\n");
}

export type SprintStart = { runId: number; scored: boolean; msLeft: number; cards: ArticleCard[] };
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
};

function errorMessage(message: string | undefined): string {
  const known = Object.keys(ERRORS).find((code) => message?.includes(code));
  return known ? ERRORS[known] : "Could not reach the game. Try again.";
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export async function startSprint(
  supabase: SupabaseClient,
  language: TargetLanguage,
  level: string
): Promise<Result<SprintStart>> {
  const { data, error } = await supabase.rpc("article_sprint_start", {
    p_language: language,
    p_level: level,
  });
  return error || !data ? { ok: false, error: errorMessage(error?.message) } : { ok: true, value: data as SprintStart };
}

/** `answers[i]` is the article picked for card i. */
export async function finishSprint(
  supabase: SupabaseClient,
  runId: number,
  answers: string[]
): Promise<Result<SprintResult>> {
  const { data, error } = await supabase.rpc("article_sprint_finish", {
    p_run_id: runId,
    p_answers: answers,
  });
  return error || !data ? { ok: false, error: errorMessage(error?.message) } : { ok: true, value: data as SprintResult };
}

export async function loadArticleStats(
  supabase: SupabaseClient,
  language: TargetLanguage
): Promise<ArticleStats | null> {
  const { data, error } = await supabase.rpc("article_stats", { p_language: language });
  return error || !data ? null : (data as ArticleStats);
}
