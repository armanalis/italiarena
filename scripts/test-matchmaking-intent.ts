/**
 * Verifies post-match review is not yanked into auto-search.
 * Run: npx tsx scripts/test-matchmaking-intent.ts
 */
import assert from "node:assert/strict";
import {
  armMatchmakingAutosearch,
  disarmMatchmakingAutosearch,
  shouldAutosearchMatchmaking,
} from "../lib/matchmaking-intent";

const memory = new Map<string, string>();

(globalThis as { sessionStorage: Storage }).sessionStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, String(value));
  },
  removeItem: (key) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
};

let passed = 0;
function check(name: string, fn: () => void) {
  try {
    memory.clear();
    fn();
    passed += 1;
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

check("unset defaults to auto-search (fresh visit)", () => {
  assert.equal(shouldAutosearchMatchmaking(), true);
});

check("arm enables auto-search", () => {
  armMatchmakingAutosearch();
  assert.equal(shouldAutosearchMatchmaking(), true);
});

check("disarm after match blocks auto-search", () => {
  armMatchmakingAutosearch();
  disarmMatchmakingAutosearch();
  assert.equal(shouldAutosearchMatchmaking(), false);
});

check("disarm survives repeated reads (Strict Mode remount)", () => {
  disarmMatchmakingAutosearch();
  assert.equal(shouldAutosearchMatchmaking(), false);
  assert.equal(shouldAutosearchMatchmaking(), false);
});

check("Play again can re-arm after disarm", () => {
  disarmMatchmakingAutosearch();
  assert.equal(shouldAutosearchMatchmaking(), false);
  armMatchmakingAutosearch();
  assert.equal(shouldAutosearchMatchmaking(), true);
});

console.log(`\n${passed} checks passed`);
if (process.exitCode) {
  console.error("Matchmaking intent verification FAILED");
} else {
  console.log("Matchmaking intent OK — review stay / intentional search wired");
}
