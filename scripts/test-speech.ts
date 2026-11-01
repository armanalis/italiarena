/**
 * Pronunciation: which device voice speaks, and what part of a question is read.
 * Run: npx tsx scripts/test-speech.ts
 */
import assert from "node:assert/strict";
import { pickVoice, speakableQuestion } from "../lib/speech";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const voices = [
  { lang: "en-US", name: "Samantha" },
  { lang: "de-CH", name: "Swiss" },
  { lang: "de-DE", name: "Anna" },
  { lang: "it_IT", name: "Android Italian" },
];

check("the home-region voice wins, any region is the fallback", () => {
  assert.equal(pickVoice(voices, "German")?.name, "Anna");
  assert.equal(pickVoice([voices[0], voices[1]], "German")?.name, "Swiss");
  assert.equal(pickVoice(voices, "Italian")?.name, "Android Italian");
});

check("no voice for the language means no button", () => {
  assert.equal(pickVoice([voices[0]], "Italian"), undefined);
  assert.equal(pickVoice([], "German"), undefined);
});

check("meaning questions read the word, or its example sentence", () => {
  assert.equal(speakableQuestion("What does 'der Strand' mean?", "the beach"), "der Strand");
  assert.equal(speakableQuestion("What does the word 'l'albero' mean?", "the tree"), "l'albero");
  assert.equal(speakableQuestion("What is 'il ghiaccio'?", "ice"), "il ghiaccio");
  assert.equal(
    speakableQuestion("What does 'günstig' mean in 'Die Wohnung ist günstig'?", "cheap"),
    "Die Wohnung ist günstig"
  );
});

check("blanks are filled with the right answer, English hints dropped", () => {
  assert.equal(
    speakableQuestion("Complete: 'Questa è ___ (my) macchina.'", "la mia"),
    "Questa è la mia macchina."
  );
  assert.equal(
    speakableQuestion("Complete: '___ un caffè, per favore.' (polite request)", "Vorrei"),
    "Vorrei un caffè, per favore."
  );
  assert.equal(speakableQuestion("Wir warten ___ den Bus.", "auf"), "Wir warten auf den Bus.");
  assert.equal(speakableQuestion("Complete: '___ arancia è rossa.'", "L'"), "L'arancia è rossa.");
});

check("English quotes, two blanks or no answer get no audio", () => {
  assert.equal(speakableQuestion("How do you say 'thank you'?", "grazie"), null);
  assert.equal(speakableQuestion("Which verb means 'to sleep'?", "dormire"), null);
  assert.equal(speakableQuestion("Complete: 'Ho comprato ___ pane e ___ frutta.'", "del, della"), null);
  assert.equal(speakableQuestion("Wir warten ___ den Bus.", ""), null);
});

console.log(`\n${passed} speech checks passed`);
