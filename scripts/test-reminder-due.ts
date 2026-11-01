/**
 * Daily reminders: due once the player's clock reaches their hour, once per
 * local day, even when the hourly trigger skips hours; one per streak at risk.
 * Run: npx tsx scripts/test-reminder-due.ts
 */
import assert from "node:assert/strict";
import { buildDailyReminderPayloads, isReminderDue, type ReminderUser } from "../lib/push";

const rome = (hour: number | null, lastSent: string | null = null): ReminderUser => ({
  daily_reminder_hour: hour,
  timezone: "Europe/Rome",
  last_reminder_sent_at: lastSent,
});
const at = (iso: string) => new Date(iso);

// 2026-10-15: Rome is UTC+2. The trigger really ran at 12:16 and 17:28 UTC.
assert.equal(isReminderDue(rome(18), at("2026-10-15T12:16:00Z")), false, "14:16 in Rome: too early");
assert.equal(isReminderDue(rome(18), at("2026-10-15T17:28:00Z")), true, "19:28 in Rome: the 18:00 run was skipped, send now");
assert.equal(isReminderDue(rome(18, "2026-10-15T17:28:00Z"), at("2026-10-15T20:41:00Z")), false, "already sent today");
assert.equal(isReminderDue(rome(18, "2026-10-14T16:05:00Z"), at("2026-10-15T16:05:00Z")), true, "sent yesterday, due again today");
assert.equal(isReminderDue(rome(18, "2026-10-14T16:05:00Z"), at("2026-10-15T22:30:00Z")), false, "00:30 in Rome on the 16th: not 18:00 yet");
assert.equal(isReminderDue(rome(0, "2026-10-14T22:30:00Z"), at("2026-10-15T22:30:00Z")), true, "midnight reminder on the new Rome day");
assert.equal(isReminderDue(rome(null), at("2026-10-15T16:00:00Z")), true, "no hour saved: 18:00");

assert.equal(
  isReminderDue({ daily_reminder_hour: 9, timezone: "Asia/Tokyo", last_reminder_sent_at: null }, at("2026-10-15T01:00:00Z")),
  true,
  "10:00 in Tokyo"
);
assert.equal(
  isReminderDue({ daily_reminder_hour: 18, timezone: "Mars/Base", last_reminder_sent_at: null }, at("2026-10-15T16:30:00Z")),
  true,
  "unknown zone falls back to Rome (18:30)"
);

console.log("ok - reminder due: at or after the chosen hour, once per local day");

const none = buildDailyReminderPayloads([
  { game: "arena", streak: 0, played_today: false },
  { game: "wordle", streak: 4, played_today: true },
]);
assert.deepEqual(none.map((p) => p.tag), ["daily-reminder"], "no streak at risk: the usual reminder");
const atRisk = buildDailyReminderPayloads([
  { game: "arena", streak: 3, played_today: false },
  { game: "wordle", streak: 5, played_today: true },
  { game: "passaparola", streak: 2, played_today: false },
  { game: "articles", streak: 6, played_today: false },
]);
assert.deepEqual(
  atRisk.map((p) => [p.tag, p.url, p.body]),
  [
    ["daily-reminder-arena", "/matchmaking", "Keep your 3-day Arena streak alive: one quick match is enough."],
    ["daily-reminder-passaparola", "/word-wheel", "Keep your 2-day Word Wheel streak alive: five minutes is enough."],
    ["daily-reminder-articles", "/articles", "Keep your 6-day articles streak alive: one 60-second Sprint is enough."],
  ],
  "one reminder per streak at risk, opening its game"
);
assert.deepEqual(buildDailyReminderPayloads([]).map((p) => p.tag), ["daily-reminder"], "streaks not loaded");
assert.deepEqual(
  buildDailyReminderPayloads([{ game: "wordle", streak: 4, played_today: true }], 5).map((p) => [p.url, p.body]),
  [["/stats?review=1", "5 mistakes are waiting for review: about 2 min."]],
  "no streak at risk: the mistakes due for review"
);
assert.equal(
  buildDailyReminderPayloads([{ game: "arena", streak: 3, played_today: false }], 5)[0].tag,
  "daily-reminder-arena",
  "a streak at risk comes first"
);

console.log("ok - reminder payloads: one per streak at risk, the usual one otherwise");
