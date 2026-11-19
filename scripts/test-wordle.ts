/**
 * Wordle puzzle dates and game state. (Scoring runs in the database:
 * wordle_marks, checked by npm run test:sql.)
 * Run: npx tsx scripts/test-wordle.ts
 */
import assert from "node:assert/strict";
import {
  addDays,
  italyToday,
  keyboardMarks,
  puzzleNumber,
  toWordleArchive,
  toWordleView,
  wordleShareText,
} from "../lib/wordle";
import { languageFromCode } from "../lib/constants";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("the database's c/p/a marks become board colors", () => {
  const view = toWordleView("Italian", "A2", "2026-10-11", {
    today: "2026-10-12",
    guesses: ["tappo"],
    marks: ["pcpaa"],
    status: "playing",
    answer: null,
    meaning: null,
    history: null,
  });
  assert.deepEqual(view.guesses[0].marks, ["present", "correct", "present", "absent", "absent"]);
  assert.equal(view.number, 2);
  assert.equal(view.isToday, false);
});

check("a shared German result names the language and links to the German puzzle", () => {
  const view = toWordleView("German", "B1", "2026-10-11", {
    today: "2026-10-12",
    guesses: ["räume"],
    marks: ["ccccc"],
    status: "won",
    answer: "räume",
    meaning: "rooms",
    history: null,
  });
  const text = wordleShareText(view, "https://italiarena.com");
  assert.match(text, /^Italiarena Wordle #2 · German · B1 · 1\/6/);
  assert.match(text, /\/wordle\?lang=de&level=B1&day=2026-10-11$/);
  assert.equal(languageFromCode("de"), "German");
  assert.equal(languageFromCode("fr"), undefined);
});

check("keyboard keeps the best mark per letter", () => {
  const marks = keyboardMarks([
    { word: "tappo", marks: ["present", "correct", "present", "absent", "absent"] },
    { word: "pasta", marks: ["correct", "correct", "correct", "correct", "correct"] },
  ]);
  assert.equal(marks.p, "correct");
  assert.equal(marks.o, "absent");
});

check("archive lists past days newest first, from puzzle #1", () => {
  const archive = toWordleArchive("2026-10-13", { "2026-10-11": "won" });
  assert.deepEqual(
    archive.map((day) => [day.date, day.number, day.status]),
    [
      ["2026-10-12", 3, null],
      ["2026-10-11", 2, "won"],
      ["2026-10-10", 1, null],
    ]
  );
  assert.equal(toWordleArchive("2026-12-31", {}).length, 30);
});

check("puzzle dates follow Italy time", () => {
  // 23:30 UTC on 10 Oct is already 11 Oct in Italy (summer time).
  assert.equal(italyToday(new Date("2026-10-10T23:30:00Z")), "2026-10-11");
  assert.equal(puzzleNumber("2026-10-10"), 1);
  assert.equal(puzzleNumber(addDays("2026-10-10", 30)), 31);
});

console.log(`\n${passed} checks passed`);
console.log("Wordle verification OK");
