/**
 * Regression tests for the match question countdown.
 * Run: npx tsx scripts/test-match-timer.ts
 *
 * Bug: leftover report-dialog pause (or a future-skewed roundStartedAt) made
 * some questions open at ~35s instead of ROUND_DURATION_SEC (25).
 */
import assert from "node:assert/strict";
import {
  clampRoundTimeRemainingSec,
  FRESH_ROUND_TIMER_STATE,
  getRoundElapsedSec,
  getRoundPauseMs,
  getRoundTimeRemainingSec,
} from "../lib/match-timer";
import { ROUND_DURATION_SEC } from "../lib/match-timing";

const NOW = 1_700_000_000_000;

function oldRemaining(roundStartedAt: number, pauseMs: number, now: number) {
  const elapsed = Math.floor((now - roundStartedAt - pauseMs) / 1000);
  return Math.max(0, ROUND_DURATION_SEC - elapsed);
}

assert.equal(ROUND_DURATION_SEC, 25);
assert.equal(FRESH_ROUND_TIMER_STATE.timeRemaining, ROUND_DURATION_SEC);
assert.equal(FRESH_ROUND_TIMER_STATE.timerPauseOffsetMs, 0);
assert.equal(FRESH_ROUND_TIMER_STATE.timerPauseStartedAt, null);

// Fresh round at T0 → full duration.
assert.equal(getRoundTimeRemainingSec(NOW, 0, ROUND_DURATION_SEC, NOW), 25);

// 10s into the round → 15s left.
assert.equal(
  getRoundTimeRemainingSec(NOW, 0, ROUND_DURATION_SEC, NOW + 10_000),
  15
);

// Carryover pause used to inflate the next question to 35s.
const carryoverPauseMs = 10_000;
assert.equal(oldRemaining(NOW, carryoverPauseMs, NOW), 35);
assert.equal(
  getRoundTimeRemainingSec(NOW, carryoverPauseMs, ROUND_DURATION_SEC, NOW),
  25,
  "pause carryover must not open the clock above ROUND_DURATION_SEC"
);

// Future-skewed start (clock / sync stamp) used to show 35s.
assert.equal(oldRemaining(NOW + 10_000, 0, NOW), 35);
assert.equal(
  getRoundTimeRemainingSec(NOW + 10_000, 0, ROUND_DURATION_SEC, NOW),
  25,
  "future roundStartedAt must not open the clock above ROUND_DURATION_SEC"
);

// Elapsed never goes negative.
assert.equal(getRoundElapsedSec(NOW + 10_000, 0, NOW), 0);
assert.equal(getRoundElapsedSec(NOW, 10_000, NOW), 0);

// Legitimate in-round pause still extends the clock (without exceeding 25 shown
// at the moment answering resumes).
assert.equal(
  getRoundTimeRemainingSec(NOW, 8_000, ROUND_DURATION_SEC, NOW + 8_000),
  25
);
assert.equal(
  getRoundTimeRemainingSec(NOW, 8_000, ROUND_DURATION_SEC, NOW + 13_000),
  20
);

// Active pause while the dialog is open.
assert.equal(
  getRoundPauseMs(
    { timerPauseOffsetMs: 1_000, timerPauseStartedAt: NOW - 2_000 },
    NOW
  ),
  3_000
);
assert.equal(
  getRoundPauseMs(
    { timerPauseOffsetMs: 500, timerPauseStartedAt: null },
    NOW
  ),
  500
);

// Defensive clamp for stored/displayed values.
assert.equal(clampRoundTimeRemainingSec(35), 25);
assert.equal(clampRoundTimeRemainingSec(-3), 0);
assert.equal(clampRoundTimeRemainingSec(12.9), 12);
assert.equal(clampRoundTimeRemainingSec(Number.NaN), 25);

console.log("test-match-timer: all assertions passed");
