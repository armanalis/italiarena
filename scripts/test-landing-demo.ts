/**
 * The landing demo asks in the visitor's language (German after a /german link).
 * Run: npx tsx scripts/test-landing-demo.ts
 */
import assert from "node:assert/strict";
import { pickDemoOpponent, pickDemoQuestions } from "../lib/landing-demo-questions";

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
console.log("ok - landing demo: German questions and names for German visitors, Italian by default");
