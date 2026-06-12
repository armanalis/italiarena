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

export function isConnectionError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase();
  return CONNECTION_PATTERNS.some((pattern) => message.includes(pattern));
}

/** Stale tab after a deploy — old HTML points at JS chunks that no longer exist. */
export function isChunkLoadError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase();
  return CHUNK_LOAD_PATTERNS.some((pattern) => message.includes(pattern));
}

export function isRecoverableClientError(error: Error): boolean {
  return isConnectionError(error) || isChunkLoadError(error);
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
  return new Error(typeof value === "string" ? value : "Unknown error");
}
