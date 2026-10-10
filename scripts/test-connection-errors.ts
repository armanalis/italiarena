/**
 * A lost connection must show "Can't reach the server", not a misleading sign-in error.
 * Run: npx tsx scripts/test-connection-errors.ts
 */
import assert from "node:assert/strict";
import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { errorFromUnknown, isConnectionError } from "../lib/errors";
// Exact shapes supabase-js produces when the database cannot be reached.
assert.equal(isConnectionError(errorFromUnknown({ message: "TypeError: fetch failed", details: "", hint: "", code: "" })), true);
assert.equal(isConnectionError(new AuthRetryableFetchError("fetch failed", 0)), true);
// Real sign-in mistakes keep their own message.
assert.equal(isConnectionError(errorFromUnknown({ message: "Invalid login credentials" })), false);
assert.equal(isConnectionError(errorFromUnknown({ message: "No account found for that username." })), false);
console.log("ok - connection errors recognised, sign-in mistakes not");
