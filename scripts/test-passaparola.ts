/**
 * Passaparola letter order. (Answers are checked in the database:
 * passaparola_turn, covered by npm run test:sql.)
 * Run: npx tsx scripts/test-passaparola.ts
 */
import assert from "node:assert/strict";
import { fitsLetter, nextLetter, PASSAPAROLA_LETTERS } from "../lib/passaparola";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("the next letter skips answered ones and wraps around", () => {
  const letters = ["A", "B", "C", "D"];
  assert.equal(nextLetter(letters, {}, null), "A");
  assert.equal(nextLetter(letters, { B: "right" }, "A"), "C");
  assert.equal(nextLetter(letters, { A: "wrong" }, "D"), "B");
  // Passing the only letter left stays on it.
  assert.equal(nextLetter(letters, { A: "right", B: "right", D: "wrong" }, "C"), "C");
  assert.equal(nextLetter(letters, { A: "right", B: "right", C: "right", D: "wrong" }, "C"), null);
});

check("a passed letter comes back only after every other letter is answered", () => {
  const letters = [..."ABCDE"];
  const marks: Record<string, "right" | "wrong"> = {};
  // Pass B; answer A, C, D, E in between.
  const order: string[] = [];
  let letter: string | null = nextLetter(letters, marks, null);
  while (letter) {
    order.push(letter);
    if (letter !== "B" || order.filter((seen) => seen === "B").length > 1) {
      marks[letter] = "right";
    }
    letter = nextLetter(letters, marks, letter);
  }
  assert.deepEqual(order, [..."ABCDEB"]);
});

check("only words starting with the letter, or passo/basta, can be typed", () => {
  assert.equal(fitsLetter("", "G"), true);
  assert.equal(fitsLetter("Gatto", "G"), true);
  assert.equal(fitsLetter("è", "E"), true);
  assert.equal(fitsLetter("cane", "G"), false);
  assert.equal(fitsLetter("pas", "G"), true);
  assert.equal(fitsLetter("passo", "G"), true);
  assert.equal(fitsLetter("basta", "G"), true);
  assert.equal(fitsLetter("bar", "G"), false);
});

check("the wheel has the 21 letters of the Italian alphabet, 23 for German", () => {
  assert.equal(PASSAPAROLA_LETTERS.Italian.join(""), "ABCDEFGHILMNOPQRSTUVZ");
  assert.equal(PASSAPAROLA_LETTERS.German.join(""), "ABCDEFGHIJKLMNOPRSTUVWZ");
  // A German word starting with an umlaut fits its plain letter.
  assert.equal(fitsLetter("Übung", "U"), true);
  assert.equal(fitsLetter("Äpfel", "A"), true);
});

console.log(`\n${passed} checks passed`);
