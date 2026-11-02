/** Picture Duel clock and level rules (the duel itself is tested in supabase/picture-duel-sql.test.mjs). */
import assert from "node:assert/strict";
import { clockMs, pictureLevelFor, type PictureDuel } from "../lib/picture-duel";

const started = Date.parse("2026-11-02T10:00:00Z");
const duel = {
  host_id: "host",
  guest_id: "guest",
  status: "active",
  turn: "host",
  turn_started_at: new Date(started).toISOString(),
  host_ms: 50_000,
  guest_ms: 60_000,
} as PictureDuel;

// Only the running clock moves.
assert.equal(clockMs(duel, "host", started + 12_345), 37_655);
assert.equal(clockMs(duel, "guest", started + 12_345), 60_000);
// During the countdown (start still ahead) nothing moves; past 0 it stays at 0.
assert.equal(clockMs(duel, "host", started - 2_000), 50_000);
assert.equal(clockMs(duel, "host", started + 99_000), 0);
// A finished duel shows what the server kept.
assert.equal(clockMs({ ...duel, status: "finished", host_ms: 0 }, "host", started + 1_000), 0);

assert.equal(pictureLevelFor("A1"), "A1");
assert.equal(pictureLevelFor("A1-A2"), "A1-A2");
assert.equal(pictureLevelFor("A2-B1"), "A2");
assert.equal(pictureLevelFor("C1"), "A2");

console.log("picture duel: ok");
