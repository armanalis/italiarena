/**
 * The app language: the browser's first supported language, the Turkish
 * dictionary with {name} parts, and every t("…") text in the code translated.
 * Run: npx tsx scripts/test-i18n.ts
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { translator, uiLanguageFromHeader } from "../lib/i18n";
import { TR } from "../lib/i18n-tr";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("the browser's language: the first supported one by weight, else English", () => {
  assert.equal(uiLanguageFromHeader("tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"), "tr");
  assert.equal(uiLanguageFromHeader("en-US,en;q=0.9,tr;q=0.8"), "en");
  assert.equal(uiLanguageFromHeader("de-DE,de;q=0.9,tr;q=0.5"), "tr", "German is not an app language: the next one is");
  assert.equal(uiLanguageFromHeader("en;q=0.4,tr;q=0.6"), "tr", "by weight, not by order");
  assert.equal(uiLanguageFromHeader("fr-FR"), "en");
  assert.equal(uiLanguageFromHeader("tr;q=0"), "en", "q=0 means not wanted");
  assert.equal(uiLanguageFromHeader(""), "en");
  assert.equal(uiLanguageFromHeader(null), "en");
});

check("t(): Turkish from the dictionary, English as written, {name} filled in", () => {
  const tr = translator(TR);
  const en = translator(null);
  assert.equal(tr("Settings"), "Ayarlar");
  assert.equal(en("Settings"), "Settings");
  assert.equal(tr("A text nobody translated"), "A text nobody translated");
  assert.equal(en("{n} to review today", { n: 3 }), "3 to review today");
  assert.equal(en("{who} and {n}", { n: 2 }), "{who} and 2", "a missing name stays visible, not 'undefined'");
});

check("every Turkish text keeps the {name} parts of its English", () => {
  const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  for (const [english, turkish] of Object.entries(TR)) {
    assert.equal(names(turkish), names(english), `"${english}" → "${turkish}"`);
  }
});

check('every t("…") text in the app has its Turkish', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) files.push(path);
    }
  };
  ["app", "components", "lib"].forEach(walk);
  const missing = new Set<string>();
  for (const file of files) {
    // Comments may show t("…") as an example: only code counts. (The [^:] keeps "https://…".)
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    for (const match of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      const text = JSON.parse(`"${match[1]}"`) as string;
      if (!(text in TR)) missing.add(`${file}: ${text}`);
    }
  }
  assert.deepEqual([...missing], [], "add these to lib/i18n-tr.ts");
});

console.log(`\n${passed} i18n checks passed`);
