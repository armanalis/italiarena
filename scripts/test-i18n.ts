/**
 * The app language: the browser's first supported language, the Turkish and
 * Italian dictionaries with {name} parts, and every t("…") text in the code translated.
 * Run: npx tsx scripts/test-i18n.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { buildAiExplanationCacheKey } from "../lib/ai-explanations";
import { buildExplanationPrompt } from "../lib/groq";
import { translator, uiLanguageFromHeader } from "../lib/i18n";
import { IT } from "../lib/i18n-it";
import { TR } from "../lib/i18n-tr";
import { getOptionText, localizeQuestion } from "../lib/resolve-match-questions";
import type { PublicQuestion } from "../types/database.types";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("the browser's language: the first supported one by weight, else English", () => {
  assert.equal(uiLanguageFromHeader("tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"), "tr");
  assert.equal(uiLanguageFromHeader("it-IT,it;q=0.9,en;q=0.8"), "it");
  assert.equal(uiLanguageFromHeader("en-US,en;q=0.9,tr;q=0.8"), "en");
  assert.equal(uiLanguageFromHeader("de-DE,de;q=0.9,tr;q=0.5"), "tr", "German is not an app language: the next one is");
  assert.equal(uiLanguageFromHeader("de-DE,de;q=0.9,it;q=0.8,en;q=0.7"), "it");
  assert.equal(uiLanguageFromHeader("en;q=0.4,tr;q=0.6"), "tr", "by weight, not by order");
  assert.equal(uiLanguageFromHeader("fr-FR"), "en");
  assert.equal(uiLanguageFromHeader("tr;q=0"), "en", "q=0 means not wanted");
  assert.equal(uiLanguageFromHeader("it;q=0"), "en", "q=0 means not wanted");
  assert.equal(uiLanguageFromHeader(""), "en");
  assert.equal(uiLanguageFromHeader(null), "en");
});

check("t(): Turkish and Italian from the dictionary, English as written, {name} filled in", () => {
  const tr = translator(TR);
  const it = translator(IT);
  const en = translator(null);
  assert.equal(tr("Settings"), "Ayarlar");
  assert.equal(it("Settings"), "Impostazioni");
  assert.equal(en("Settings"), "Settings");
  assert.equal(tr("A text nobody translated"), "A text nobody translated");
  assert.equal(it("A text nobody translated"), "A text nobody translated");
  assert.equal(en("{n} to review today", { n: 3 }), "3 to review today");
  assert.equal(en("{who} and {n}", { n: 2 }), "{who} and 2", "a missing name stays visible, not 'undefined'");
});

check("every Turkish and Italian text keeps the {name} parts of its English", () => {
  const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  for (const [label, dictionary] of [["Turkish", TR], ["Italian", IT]] as const) {
    for (const [english, translated] of Object.entries(dictionary)) {
      assert.equal(names(translated), names(english), `${label}: "${english}" → "${translated}"`);
    }
  }
});

check("a question in Turkish or Italian: the bank's text where it has it, English elsewhere", () => {
  const question: PublicQuestion = {
    id: "q", language: "Italian", level: "A1", category: "vocabulary", random_float: 0.5,
    question_text: "What does 'il cane' mean?", option_a: "the dog", option_b: "the cat", option_c: "the horse", option_d: "the bird",
    text_tr: { question_text: "'il cane' ne anlama gelir?", option_a: "köpek", option_b: "kedi", option_c: "at" },
    text_it: { question_text: "Cosa significa 'il cane'?", option_a: "il cane", option_b: "il gatto", option_c: "il cavallo" },
  };
  const tr = localizeQuestion(question, "tr");
  assert.equal(tr.question_text, "'il cane' ne anlama gelir?");
  assert.equal(getOptionText(tr, "A"), "köpek");
  assert.equal(getOptionText(tr, "D"), "the bird", "a missing key stays as it was");
  const it = localizeQuestion(question, "it");
  assert.equal(it.question_text, "Cosa significa 'il cane'?");
  assert.equal(getOptionText(it, "A"), "il cane");
  assert.equal(getOptionText(it, "D"), "the bird", "a missing key stays as it was");
  assert.equal(localizeQuestion(question, "en"), question);
  assert.equal(localizeQuestion({ ...question, text_tr: null }, "tr").question_text, question.question_text);
  assert.equal(localizeQuestion({ ...question, text_it: null }, "it").question_text, question.question_text);
  assert.equal(question.question_text, "What does 'il cane' mean?", "the original is not changed (speech reads it)");
});

check("AI explanations: in the app language, cached apart; English keys as before", () => {
  assert.equal(buildAiExplanationCacheKey("q", "B"), "q:B");
  assert.equal(buildAiExplanationCacheKey("q", null, "en"), "q:none");
  assert.equal(buildAiExplanationCacheKey("q", "B", "tr"), "q:B:tr");
  assert.equal(buildAiExplanationCacheKey("q", "B", "it"), "q:B:it");
  const payload = {
    sessionId: "s", questionId: "q", category: "Vocabulary", questionText: "'il cane' ne anlama gelir?",
    correctAnswer: "A" as const, correctOptionText: "köpek", selectedAnswer: "B" as const, selectedOptionText: "kedi", wasCorrect: false,
  };
  assert.match(buildExplanationPrompt(payload, "Italian", "tr"), /simple Turkish/);
  assert.match(buildExplanationPrompt(payload, "Italian", "it"), /simple Italian/);
  assert.match(buildExplanationPrompt(payload, "Italian"), /simple English/);
});

check('every t("…") text in the app has its Turkish and its Italian', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) files.push(path);
    }
  };
  ["app", "components", "lib"].forEach(walk);
  const missingTr = new Set<string>();
  const missingIt = new Set<string>();
  for (const file of files) {
    // Comments may show t("…") as an example: only code counts. (The [^:] keeps "https://…".)
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const match of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      const text = JSON.parse(`"${match[1]}"`) as string;
      if (!(text in TR)) missingTr.add(`${file}: ${text}`);
      if (!(text in IT)) missingIt.add(`${file}: ${text}`);
    }
  }
  assert.deepEqual([...missingTr], [], "add these to lib/i18n-tr.ts");
  assert.deepEqual([...missingIt], [], "add these to lib/i18n-it.ts");
});

console.log(`\n${passed} i18n checks passed`);
