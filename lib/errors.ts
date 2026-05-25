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

export function isConnectionError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase();
  return CONNECTION_PATTERNS.some((pattern) => message.includes(pattern));
}
