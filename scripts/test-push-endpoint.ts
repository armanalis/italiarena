/**
 * Push subscriptions must point at a real browser push service: the server
 * POSTs every notification there.
 * Run: npx tsx scripts/test-push-endpoint.ts
 */
import assert from "node:assert/strict";
import { isPushServiceEndpoint } from "../lib/push";

const cases: Record<string, boolean> = {
  "https://fcm.googleapis.com/fcm/send/abc": true,
  "https://updates.push.services.mozilla.com/wpush/v2/abc": true,
  "https://web.push.apple.com/QFabc": true,
  "https://wns2-par02p.notify.windows.com/w/?token=abc": true,
  "https://evil.example/fcm.googleapis.com": false,
  "https://fcm.googleapis.com.evil.example/abc": false,
  "https://notfcm.googleapis.com.attacker.example": false,
  "http://fcm.googleapis.com/abc": false,
  "not a url": false,
};

for (const [endpoint, allowed] of Object.entries(cases)) {
  assert.equal(isPushServiceEndpoint(endpoint), allowed, endpoint);
}

console.log(`Push endpoint check OK — ${Object.keys(cases).length} cases`);
