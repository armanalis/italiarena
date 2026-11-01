/**
 * Spaced review: tomorrow → 3 days → a week → 2 weeks → learned; wrong starts over.
 * Run: npx tsx scripts/test-review.ts
 */
import assert from "node:assert/strict";
import { nextReview, reviewMinutes, whenDue } from "../lib/review";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("right when due: 3 days, a week, 2 weeks, then learned", () => {
  let state = { streak: 0, dueOn: "2026-11-02" };
  let today = "2026-11-02";
  const due: string[] = [];
  for (let review = 0; review < 3; review += 1) {
    const next = nextReview(state, true, today);
    assert.equal(next.learned, false);
    if (next.learned) return;
    due.push(next.dueOn);
    state = { streak: next.streak, dueOn: next.dueOn };
    today = next.dueOn;
  }
  assert.deepEqual(due, ["2026-11-05", "2026-11-12", "2026-11-26"]);
  assert.deepEqual(nextReview(state, true, today), { learned: true });
});

check("wrong goes back to tomorrow with the count from zero", () => {
  assert.deepEqual(nextReview({ streak: 3, dueOn: "2026-11-26" }, false, "2026-11-26"), {
    learned: false,
    streak: 0,
    dueOn: "2026-11-27",
  });
});

check("right before its day changes nothing: reviews must be on different days", () => {
  assert.deepEqual(nextReview({ streak: 1, dueOn: "2026-11-05" }, true, "2026-11-02"), {
    learned: false,
    streak: 1,
    dueOn: "2026-11-05",
  });
});

check("an overdue mistake counts from the day it is reviewed", () => {
  assert.deepEqual(nextReview({ streak: 1, dueOn: "2026-11-05" }, true, "2026-11-20"), {
    learned: false,
    streak: 2,
    dueOn: "2026-11-27",
  });
});

check("about 20 seconds a mistake; due dates in words", () => {
  assert.equal(reviewMinutes(1), 1);
  assert.equal(reviewMinutes(5), 2);
  assert.equal(reviewMinutes(12), 4);
  assert.equal(whenDue("2026-11-02", "2026-11-02"), "today");
  assert.equal(whenDue("2026-11-03", "2026-11-02"), "tomorrow");
  assert.equal(whenDue("2026-11-05", "2026-11-02"), "in 3 days");
  assert.equal(whenDue("2026-11-09", "2026-11-02"), "in a week");
  assert.equal(whenDue("2026-11-16", "2026-11-02"), "in 2 weeks");
  assert.equal(whenDue("2026-11-20", "2026-11-02"), "on 20 Nov");
});

console.log(`\n${passed} review checks passed`);
