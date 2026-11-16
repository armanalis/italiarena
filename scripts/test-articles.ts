/**
 * Article game rules: buttons, the Italian article from a noun's sound, the
 * one-line rules, the time bonus. (Scoring is in the database: npm run test:sql.)
 * Run: npx tsx scripts/test-articles.ts
 */
import { translator } from "../lib/i18n";
import { IT } from "../lib/i18n-it";
import { TR } from "../lib/i18n-tr";
import assert from "node:assert/strict";
import {
  articleChoices,
  articleRule,
  articleShareText,
  bonusAfter,
  italianArticle,
  nounQuestion,
  fillPreposition,
  toSprintArchive,
  withArticle,
} from "../lib/articles";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("buttons: der·die·das, il·lo·la·l', and i·gli·le for Italian plurals", () => {
  assert.deepEqual(articleChoices("German", "das"), ["der", "die", "das"]);
  assert.deepEqual(articleChoices("Italian", "l'"), ["il", "lo", "la", "l'"]);
  assert.deepEqual(articleChoices("Italian", "gli"), ["i", "gli", "le"]);
});

check("a preposition button joins the blank, and an apostrophe eats the space", () => {
  assert.equal(fillPreposition("Vado ___università", "all'"), "Vado all'università");
  assert.equal(fillPreposition("Vado ___ università", "all'"), "Vado all'università");
  assert.equal(fillPreposition("Wir gehen ___ Park.", "in den"), "Wir gehen in den Park.");
  assert.equal(fillPreposition("___ Morgen fahre ich.", "Am"), "Am Morgen fahre ich.");
  assert.equal(fillPreposition("È ___ casa.", "per la"), "È per la casa.");
});

check("the Italian article follows gender and first sound", () => {
  const cases: [string, "m" | "f", boolean, string | null][] = [
    ["libro", "m", false, "il"],
    ["sole", "m", false, "il"],
    ["studente", "m", false, "lo"],
    ["zaino", "m", false, "lo"],
    ["gnomo", "m", false, "lo"],
    ["psicologo", "m", false, "lo"],
    ["amico", "m", false, "l'"],
    ["acqua", "f", false, "l'"],
    ["casa", "f", false, "la"],
    ["libri", "m", true, "i"],
    ["studenti", "m", true, "gli"],
    ["amici", "m", true, "gli"],
    ["amiche", "f", true, "le"],
    ["scarpe", "f", true, "le"],
    // Unclear or split usage stays out of the game.
    ["hotel", "m", false, null],
    ["pneumatico", "m", false, null],
    ["yogurt", "m", false, null],
    ["iato", "m", false, null],
  ];
  for (const [noun, gender, plural, article] of cases) {
    assert.equal(italianArticle(noun, gender, plural), article, noun);
  }
});

check("German rules are only shown for nouns that follow them", () => {
  assert.equal(articleRule("German", "Zeitung", "die"), "-ung words are always die");
  assert.equal(articleRule("German", "Mädchen", "das"), "-chen and -lein (little things) are always das");
  assert.equal(articleRule("German", "Kuchen", "der"), null);
  assert.equal(articleRule("German", "Junge", "der"), null);
  assert.equal(articleRule("German", "Tisch", "der"), null);
  assert.equal(articleRule("Italian", "studente", "lo"), "lo: masculine, before s + consonant, z, gn, ps (lo studente, lo zaino)");
});

check("a second for every 5 right in a row, or the server's bonus", () => {
  // 12 right, 1 wrong, 7 right: bonuses at 5, 10 and 5.
  const results = [...Array(12).fill(true), false, ...Array(7).fill(true)];
  let streak = 0;
  let bonus = 0;
  let preposition = 0;
  for (const right of results) {
    streak = right ? streak + 1 : 0;
    bonus += bonusAfter(streak);
    preposition += bonusAfter(streak, 10_000);
  }
  assert.equal(bonus, 3_000);
  assert.equal(preposition, 30_000);
  assert.equal(bonusAfter(0), 0);
  assert.equal(bonusAfter(5, 10_000), 10_000);
});

check("written with the article, and shared without spoilers", () => {
  assert.equal(withArticle("die", "Zeitung"), "die Zeitung");
  assert.equal(withArticle("l'", "amico"), "l'amico");
  assert.equal(
    articleShareText("German", "A2", 23, "https://italiarena.com"),
    "Italiarena der·die·das 23 · A2\nhttps://italiarena.com/articles?lang=de&level=A2"
  );
  assert.equal(
    articleShareText("English", "B1", 12, "https://italiarena.com", "preposition", "2026-11-14"),
    "Italiarena in·on·at 12 · B1 · 2026-11-14\nhttps://italiarena.com/prepositions?lang=en&level=B1&day=2026-11-14"
  );
});

check("the sprint archive is the 30 days before today, newest first", () => {
  const archive = toSprintArchive("2026-11-15", { "2026-11-14": 23 });
  assert.equal(archive.length, 30);
  assert.deepEqual(archive[0], { date: "2026-11-14", score: 23 });
  assert.deepEqual(archive[1], { date: "2026-11-13", score: null });
  assert.equal(archive.at(-1)?.date, "2026-10-16");
});

check("a missed noun becomes a Mistakes question with the letters the database saves", () => {
  const zeitung = nounQuestion({ id: 7, language: "German", level: "A1", noun: "Zeitung", article: "die", meaning: "newspaper" });
  assert.equal(zeitung.id, "noun:7");
  assert.deepEqual([zeitung.option_a, zeitung.option_b, zeitung.option_c, zeitung.option_d], ["der", "die", "das", ""]);
  assert.equal(zeitung.correct_answer, "B");
  const studenti = nounQuestion({ id: 8, language: "Italian", level: "B1", noun: "studenti", article: "gli", meaning: "students" });
  assert.deepEqual([studenti.option_a, studenti.option_b, studenti.option_c], ["i", "gli", "le"]);
  assert.equal(studenti.correct_answer, "B");
  const amico = nounQuestion({ id: 9, language: "Italian", level: "A1", noun: "amico", article: "l'", meaning: "friend" });
  assert.equal(amico.correct_answer, "D");
  const born = nounQuestion({
    id: 11,
    language: "English",
    level: "A2",
    kind: "preposition",
    noun: "She was born ___ 1990.",
    article: "in",
    meaning: null,
    choices: ["in", "on", "at", "to"],
    rule: "time-in",
  });
  assert.equal(born.question_text, "She was born ___ 1990.");
  assert.deepEqual([born.option_a, born.option_b, born.option_c, born.option_d], ["in", "on", "at", "to"]);
  assert.equal(born.correct_answer, "A");
  assert.equal(born.rule, "time-in");
});

check("the question reads in the app language, with the Turkish or Italian meaning when there is one", () => {
  const casa = { id: 10, language: "Italian" as const, level: "A1", noun: "casa", article: "la", meaning: "house, home", meaning_tr: "ev" };
  assert.equal(nounQuestion(casa).question_text, "Which article? casa (house, home)");
  assert.equal(nounQuestion(casa, translator(TR), "tr").question_text, "Hangi artikel? casa (ev)");
  assert.equal(
    nounQuestion({ ...casa, meaning_tr: null }, translator(TR), "tr").question_text,
    "Hangi artikel? casa (house, home)",
    "no Turkish meaning yet: the English one"
  );
  assert.equal(
    nounQuestion({ ...casa, meaning_it: "casa, abitazione" }, translator(IT), "it").question_text,
    translator(IT)("Which article? {noun} ({meaning})", { noun: "casa", meaning: "casa, abitazione" })
  );
  assert.equal(
    nounQuestion({ ...casa, meaning_it: null }, translator(IT), "it").question_text,
    translator(IT)("Which article? {noun} ({meaning})", { noun: "casa", meaning: "house, home" }),
    "no Italian meaning yet: the English one"
  );
  assert.equal(
    nounQuestion({ ...casa, meaning_it: "casa, abitazione" }, translator(TR), "tr").question_text,
    "Hangi artikel? casa (ev)",
    "Italian meaning is not used in Turkish"
  );
});

console.log(`\n${passed} article checks passed`);
