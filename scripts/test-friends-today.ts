/**
 * Today with friends: sorted by score, results written without spoilers.
 * (Who is listed and what leaves the database: npm run test:sql.)
 * Run: npx tsx scripts/test-friends-today.ts
 */
import assert from "node:assert/strict";
import { sortFriendsToday, todayResults, type FriendToday } from "../lib/friends-today";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const row = (name: string, parts: Partial<FriendToday>): FriendToday => ({
  user_id: name,
  display_name: name,
  is_me: name === "You",
  wordle: null,
  word_wheel: null,
  sprint: null,
  ...parts,
});

const bea = row("Bea", {
  wordle: { level: "A2", guesses: 4, won: true },
  word_wheel: { level: "A2", right: 18, total: 21 },
  sprint: { level: "A2", score: 23 },
});
const you = row("You", { wordle: { level: "A2", guesses: 2, won: true }, sprint: { level: "B1", score: 30 } });
const carlo = row("Carlo", { wordle: { level: "A2", guesses: 6, won: false } });
const dario = row("Dario", {});

check("sorted by score: Wordle by guesses, letters right, Sprint score", () => {
  // Bea 3 + 18 + 23 = 44, You 5 + 30 = 35, Carlo 0 (lost), Dario 0: names break ties.
  assert.deepEqual(sortFriendsToday([carlo, you, dario, bea]).map((r) => r.display_name), ["Bea", "You", "Carlo", "Dario"]);
});

check("results read like the plan: Wordle 4/6 · Word Wheel 18/21 · Sprint 23", () => {
  assert.deepEqual(todayResults(bea, "German"), [
    { game: "Wordle", score: "4/6", level: "A2" },
    { game: "Word Wheel", score: "18/21", level: "A2" },
    { game: "der·die·das", score: "23", level: "A2" },
  ]);
  assert.deepEqual(todayResults(carlo, "Italian"), [{ game: "Wordle", score: "X/6", level: "A2" }]);
  assert.deepEqual(todayResults(dario, "Italian"), []);
  assert.deepEqual(todayResults(you, "Italian")[1], { game: "il·lo·la", score: "30", level: "B1" });
  assert.deepEqual(
    todayResults(bea, "English").map((result) => result.game),
    ["Wordle", "Word Wheel"],
    "English has no article sprint"
  );
});

console.log(`\n${passed} friends-today checks passed`);
