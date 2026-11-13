/**
 * The landing demo asks in the visitor's language (German after a /german link, English after /english).
 * Run: npx tsx scripts/test-landing-demo.ts
 */
import assert from "node:assert/strict";
import { hasDemoQuestions, pickDemoOpponent, pickDemoQuestions } from "../lib/landing-demo-questions";

const ENGLISH_NAMES = ["Emma", "Olivia", "Sophie", "Chloe", "Lucy", "Jack", "Oliver", "Harry", "James", "Tom"];

for (let run = 0; run < 50; run += 1) {
  const german = pickDemoQuestions(3, "German");
  assert.equal(german.length, 3);
  assert.equal(new Set(german.map((question) => question.id)).size, 3);
  for (const question of german) {
    assert.ok(question.id.startsWith("de-"), question.id);
    assert.equal(question.lang, "de");
    assert.equal(question.options.length, 4);
    assert.ok(question.correct >= 0 && question.trap >= 0 && question.correct !== question.trap);
  }
  assert.ok(pickDemoQuestions().every((question) => !question.id.startsWith("de-") && question.lang === "it"));
  assert.ok(["Anna", "Lena", "Mia", "Hannah", "Lea", "Lukas", "Jonas", "Felix", "Paul", "Leon"].includes(pickDemoOpponent("German")));
}
const englishPool = pickDemoQuestions(100, "English");
assert.equal(hasDemoQuestions("English"), true);
assert.equal(englishPool.length, 12);
assert.equal(new Set(englishPool.map((question) => question.id)).size, 12);
for (const question of englishPool) {
  assert.ok(question.id.startsWith("en-"), question.id);
  assert.equal(question.lang, "en");
  assert.equal(question.options.length, 4);
  assert.ok(question.correct >= 0 && question.trap >= 0 && question.correct !== question.trap);
}
assert.ok(ENGLISH_NAMES.includes(pickDemoOpponent("English")));
console.log("ok - landing demo: German and English questions for those visitors, Italian by default");

{
  // Every question has its Turkish: the help line always, the options when they are meanings (four different ones).
  const all = [
    ...pickDemoQuestions(100, "Italian", "tr"),
    ...pickDemoQuestions(100, "German", "tr"),
    ...pickDemoQuestions(100, "English", "tr"),
  ];
  const english = [
    ...pickDemoQuestions(100, "Italian"),
    ...pickDemoQuestions(100, "German"),
    ...pickDemoQuestions(100, "English"),
  ];
  assert.equal(all.length, english.length);
  for (const question of all) {
    const original = english.find((q) => q.id === question.id)!;
    const meaning = question.category === "Vocabulary" || question.category === "Idioms";
    assert.notEqual(question.hint, original.hint, `${question.id}: no Turkish help line`);
    assert.equal(new Set(question.options).size, 4, question.id);
    assert.equal(question.optionsLang, meaning ? "tr" : question.lang);
    assert.equal(question.options.some((o) => original.options.includes(o)), !meaning, `${question.id}: options`);
    assert.ok(question.correct !== question.trap);
  }
  console.log("ok - landing demo in Turkish: every help line, and the options of every meaning question");
}
