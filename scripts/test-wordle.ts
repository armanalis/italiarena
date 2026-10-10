/**
 * Wordle scoring and puzzle dates.
 * Run: npx tsx scripts/test-wordle.ts
 */
import assert from "node:assert/strict";
import {
  addDays,
  isPlayableDate,
  italyToday,
  keyboardMarks,
  puzzleNumber,
  scoreGuess,
} from "../lib/wordle";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const short = (marks: string[]) => marks.map((mark) => mark[0]).join("");

check("exact, misplaced and missing letters", () => {
  assert.equal(short(scoreGuess("pasta", "pasta")), "ccccc");
  // The first spare "p" is yellow, the second one gray.
  assert.equal(short(scoreGuess("tappo", "pasta")), "pcpaa");
  assert.equal(short(scoreGuess("zzzzz", "pasta")), "aaaaa");
});

check("a repeated letter is yellow only as often as the answer has it", () => {
  // Answer has one "o": only the first spare "o" turns yellow.
  assert.equal(short(scoreGuess("ooxxx", "pasto")), "paaaa");
  // Both "t"s of the answer are already green, so the third "t" is gray.
  assert.equal(short(scoreGuess("tetto", "testa")), "ccaca");
});

check("keyboard keeps the best mark per letter", () => {
  const marks = keyboardMarks([
    { word: "tappo", marks: scoreGuess("tappo", "pasta") },
    { word: "pasta", marks: scoreGuess("pasta", "pasta") },
  ]);
  assert.equal(marks.p, "correct");
  assert.equal(marks.o, "absent");
});

check("puzzle dates follow Italy and stop at today", () => {
  // 23:30 UTC on 10 Oct is already 11 Oct in Italy (summer time).
  assert.equal(italyToday(new Date("2026-10-10T23:30:00Z")), "2026-10-11");
  assert.equal(puzzleNumber("2026-10-10"), 1);
  assert.equal(puzzleNumber(addDays("2026-10-10", 30)), 31);
  assert.equal(isPlayableDate("2026-10-12", "2026-10-12"), true);
  assert.equal(isPlayableDate("2026-10-13", "2026-10-12"), false);
  assert.equal(isPlayableDate("2026-10-09", "2026-10-12"), false);
  assert.equal(isPlayableDate("2026-02-30", "2026-12-01"), false);
  assert.equal(isPlayableDate("x", "2026-12-01"), false);
});

console.log(`\n${passed} checks passed`);
console.log("Wordle verification OK");
