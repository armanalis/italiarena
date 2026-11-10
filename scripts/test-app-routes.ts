/**
 * proxy.ts keeps the signed-in pages behind login by name (APP_ROUTES): a new
 * page folder missing from that list would be served to signed-out visitors.
 * Run: npx tsx scripts/test-app-routes.ts
 */
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { APP_ROUTES } from "../proxy";

const folders = readdirSync("app/(app)", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => `/${entry.name}`);

assert.deepEqual([...APP_ROUTES].sort(), folders.sort());
console.log("App routes OK");
