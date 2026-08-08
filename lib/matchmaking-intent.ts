/**
 * Controls whether the matchmaking lobby auto-starts searching on mount.
 *
 * After a match starts we disarm auto-search so a browser Back / swipe-back
 * onto `/dashboard/matchmaking` cannot yank players out of the post-match
 * review into a new "Searching for opponent..." flow. Intentional entries
 * (Find opponent, Play again, bot cards) re-arm before navigating.
 *
 * The flag is NOT cleared on read — React Strict Mode remounts would otherwise
 * treat a consumed "disarmed" value as unset and restart searching.
 */

const STORAGE_KEY = "italiarena:matchmaking-autosearch";

export function armMatchmakingAutosearch() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Private mode / disabled storage — lobby falls back to auto-search.
  }
}

export function disarmMatchmakingAutosearch() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "0");
  } catch {
    // ignore
  }
}

/** `false` only when explicitly disarmed after entering a match. */
export function shouldAutosearchMatchmaking(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}
