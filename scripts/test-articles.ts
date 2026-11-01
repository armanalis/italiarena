/**
 * Article game rules: buttons, the Italian article from a noun's sound, the
 * one-line rules, the time bonus. (Scoring is in the database: npm run test:sql.)
 * Run: npx tsx scripts/test-articles.ts
 */
import assert from "node:assert/strict";
import {
  articleChoices,
  articleRule,
  articleShareText,
  bonusAfter,
  italianArticle,
  nounQuestion,
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

check("a second for every 5 right in a row, like article_sprint_finish", () => {
  // 12 right, 1 wrong, 7 right: 2 + 1 bonus seconds.
  const results = [...Array(12).fill(true), false, ...Array(7).fill(true)];
  let streak = 0;
  let bonus = 0;
  for (const right of results) {
    streak = right ? streak + 1 : 0;
    bonus += bonusAfter(streak);
  }
  assert.equal(bonus, 3_000);
  assert.equal(bonusAfter(0), 0);
});

check("written with the article, and shared without spoilers", () => {
  assert.equal(withArticle("die", "Zeitung"), "die Zeitung");
  assert.equal(withArticle("l'", "amico"), "l'amico");
  assert.equal(
    articleShareText("German", "A2", 23, "https://italiarena.com"),
    "Italiarena der·die·das 23 · A2\nhttps://italiarena.com/articles?lang=de&level=A2"
  );
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
});

console.log(`\n${passed} article checks passed`);
