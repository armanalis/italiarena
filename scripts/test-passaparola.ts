/**
 * Passaparola letter order. (Answers are checked in the database:
 * passaparola_turn, covered by npm run test:sql.)
 * Run: npx tsx scripts/test-passaparola.ts
 */
import assert from "node:assert/strict";
import { finishWord, fitsLetter, isFinishCommand, isPassCommand, nextLetter, PASSAPAROLA_LETTERS, passWord, toWheelArchive, wheelShareText } from "../lib/passaparola";

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

check("only words starting with the letter, or skip/stop, can be typed", () => {
  assert.equal(fitsLetter("", "G"), true);
  assert.equal(fitsLetter("Gatto", "G"), true);
  assert.equal(fitsLetter("è", "E"), true);
  assert.equal(fitsLetter("cane", "G"), false);
  assert.equal(fitsLetter("sk", "G"), true);
  assert.equal(fitsLetter("skip", "G"), true);
  assert.equal(fitsLetter("stop", "G"), true);
  assert.equal(fitsLetter("sun", "G"), false);
  assert.equal(fitsLetter("salta", "G", "Italian"), true);
  assert.equal(fitsLetter("sa", "Z", "Italian"), true);
  assert.equal(fitsLetter("ferma", "G", "Italian"), true);
  assert.equal(fitsLetter("skip", "G", "Italian"), false);
  assert.equal(fitsLetter("stop", "G", "Italian"), false);
  assert.equal(fitsLetter("weiter", "G", "German"), true);
  assert.equal(fitsLetter("stopp", "G", "German"), true);
  assert.equal(fitsLetter("cane", "G", "Italian"), false);
  assert.equal(passWord("Italian"), "salta");
  assert.equal(finishWord("Italian"), "ferma");
  assert.equal(passWord("German"), "weiter");
  assert.equal(finishWord("German"), "stopp");
  assert.equal(isPassCommand("Weiter", "German"), true);
  assert.equal(isPassCommand("skip", "German"), false);
  assert.equal(isFinishCommand("STOPP", "German"), true);
  assert.equal(isPassCommand("salta", "Italian"), true);
  assert.equal(isFinishCommand("stop", "Italian"), false);
  assert.equal(isFinishCommand("Ferma", "Italian"), true);
  assert.equal(fitsLetter("paso", "G", "Spanish"), true);
  assert.equal(fitsLetter("basta", "G", "Spanish"), true);
  assert.equal(fitsLetter("skip", "G", "Spanish"), false);
  assert.equal(fitsLetter("stop", "G", "Spanish"), false);
  assert.equal(fitsLetter("niño", "N", "Spanish"), true);
  assert.equal(fitsLetter("nino", "N", "Spanish"), true);
  assert.equal(fitsLetter("el niño", "N", "Spanish"), true);
  assert.equal(fitsLetter("el cafe", "C", "Spanish"), true);
  assert.equal(fitsLetter("el cafe", "E", "Spanish"), false);
  assert.equal(fitsLetter("árbol", "A", "Spanish"), true);
  assert.equal(fitsLetter("ñandú", "N", "Spanish"), true);
  assert.equal(passWord("Spanish"), "paso");
  assert.equal(finishWord("Spanish"), "basta");
  assert.equal(fitsLetter("videre", "G", "Danish"), true);
  assert.equal(fitsLetter("stop", "G", "Danish"), true);
  assert.equal(fitsLetter("skip", "G", "Danish"), false);
  assert.equal(fitsLetter("Øl", "Ø", "Danish"), true);
  assert.equal(fitsLetter("oel", "Ø", "Danish"), true);
  assert.equal(fitsLetter("o", "Ø", "Danish"), true);
  assert.equal(fitsLetter("ol", "Ø", "Danish"), false);
  assert.equal(fitsLetter("abe", "A", "Danish"), true);
  assert.equal(fitsLetter("abe", "Æ", "Danish"), false);
  assert.equal(fitsLetter("aeble", "Æ", "Danish"), true);
  assert.equal(fitsLetter("æble", "Æ", "Danish"), true);
  assert.equal(fitsLetter("aeble", "A", "Danish"), false);
  assert.equal(fitsLetter("å", "Å", "Danish"), true);
  assert.equal(fitsLetter("aa", "Å", "Danish"), true);
  assert.equal(fitsLetter("aa", "A", "Danish"), false);
  assert.equal(fitsLetter("a", "A", "Danish"), true);
  assert.equal(fitsLetter("a", "Å", "Danish"), true);
  assert.equal(passWord("Danish"), "videre");
  assert.equal(finishWord("Danish"), "stop");
});

check("the wheel has the 21 letters of the Italian alphabet, 23 for German", () => {
  assert.equal(PASSAPAROLA_LETTERS.Italian.join(""), "ABCDEFGHILMNOPQRSTUVZ");
  assert.equal(PASSAPAROLA_LETTERS.German.join(""), "ABCDEFGHIJKLMNOPRSTUVWZ");
  assert.equal(PASSAPAROLA_LETTERS.English.join(""), "ABCDEFGHIJKLMNOPQRSTUVWYZ");
  assert.equal(PASSAPAROLA_LETTERS.Spanish.join(""), "ABCDEFGHIJLMNOPQRSTUVYZ");
  assert.equal(PASSAPAROLA_LETTERS.Danish.join(""), "ABDEFGHIJKLMNOPRSTUVÆØÅ");
  assert.equal(PASSAPAROLA_LETTERS.English.includes("X"), false);
  assert.equal(PASSAPAROLA_LETTERS.Spanish.includes("K"), false);
  assert.equal(PASSAPAROLA_LETTERS.Danish.includes("C"), false);
  // A German word starting with an umlaut fits its plain letter.
  assert.equal(fitsLetter("Übung", "U"), true);
  assert.equal(fitsLetter("Äpfel", "A"), true);
});

check("the archive is the 30 days before today, and a share names the mode and the day", () => {
  const archive = toWheelArchive("2026-11-15", {
    "2026-11-14": { right: 14, total: 21, finished: true, mode: "normal" },
    "2026-11-13": { right: 3, total: 21, finished: false, mode: "hard" },
  });
  assert.equal(archive.length, 30);
  assert.deepEqual(archive[0], { date: "2026-11-14", right: 14, total: 21, finished: true, mode: "normal" });
  assert.deepEqual(archive[1], { date: "2026-11-13", right: 3, total: 21, finished: false, mode: "hard" });
  assert.equal(archive[2].right, null);
  assert.equal(
    wheelShareText("Italian", "A2", "2026-11-14", "hard", 14, 21, "https://italiarena.com"),
    "Italiarena Word Wheel 14/21 · Italian · A2 · Hard · 2026-11-14\nhttps://italiarena.com/word-wheel?lang=it&level=A2&day=2026-11-14"
  );
});

console.log(`\n${passed} checks passed`);
