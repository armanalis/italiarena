const CONNECTION_PATTERNS = [
  "fetch",
  "network",
  "websocket",
  "connection",
  "supabase",
  "timeout",
  "econnrefused",
  "socket",
  "disconnect",
  "channel",
  "realtime",
  "postgres",
  "database",
  "db",
] as const;

const CHUNK_LOAD_PATTERNS = [
  "failed to load chunk",
  "loading chunk",
  "chunkloaderror",
  "dynamically imported module",
  "importing a module script failed",
] as const;

const CHUNK_RELOAD_KEY = "language-quiz-chunk-reload";

export const CONNECTION_ERROR_MESSAGE =
  "Can't reach the server. Check your internet connection and try again.";

/** A game call that worked, or the sentence to show the player. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** The sentence for a code the database raised (raise exception 'no_such_run'), else `fallback`. */
export function knownError(known: Record<string, string>, message: string | undefined, fallback: string): string {
  const code = Object.keys(known).find((key) => message?.includes(key));
  return code ? known[code] : fallback;
}

export function isConnectionError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase();
  return CONNECTION_PATTERNS.some((pattern) => message.includes(pattern));
}

/** Stale tab after a deploy — old HTML points at JS chunks that no longer exist. */
export function isChunkLoadError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase();
  return CHUNK_LOAD_PATTERNS.some((pattern) => message.includes(pattern));
}

/** Full reload once; returns false if we already retried (avoid infinite loops). */
export function reloadOnceAfterChunkError(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return false;
  }

  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }
}

export function errorFromUnknown(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  // supabase-js returns plain { message } objects, e.g. "TypeError: fetch failed" when offline.
  if (value && typeof value === "object" && "message" in value) {
    return new Error(String(value.message));
  }
  return new Error(typeof value === "string" ? value : "Unknown error");
}
