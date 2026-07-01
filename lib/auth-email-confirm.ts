import type { EmailOtpType } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Resolve a safe in-app path from a `next` query param or redirect URL. */
export function resolveAuthNextPath(next: string | null, origin: string) {
  if (!next) {
    return null;
  }

  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  try {
    const url = new URL(next);
    if (url.origin === origin) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

export async function verifyEmailTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
  type: EmailOtpType
) {
  return supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });
}

export function getAuthConfirmErrorCode(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("expired") ||
    normalized.includes("already been used") ||
    normalized.includes("invalid")
  ) {
    return "auth_confirm_expired";
  }

  return "auth_confirm_failed";
}
