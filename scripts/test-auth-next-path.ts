/**
 * The `next` param after sign-in/sign-out must stay on this site.
 * Run: npx tsx scripts/test-auth-next-path.ts
 */
import assert from "node:assert/strict";
import { resolveAuthNextPath } from "../lib/auth-email-confirm";

const origin = "https://app.example";

const cases: [string | null, string | null][] = [
  ["/dashboard?tab=1", "/dashboard?tab=1"],
  ["https://app.example/match/1?x=2", "/match/1?x=2"],
  ["/\\evil.example", null],
  ["/\t/evil.example", null],
  ["//evil.example", null],
  ["https://evil.example/login", null],
  ["javascript:alert(1)", null],
  [null, null],
  ["", null],
];

for (const [next, expected] of cases) {
  assert.equal(resolveAuthNextPath(next, origin), expected, JSON.stringify(next));
}

console.log("auth next path OK");
