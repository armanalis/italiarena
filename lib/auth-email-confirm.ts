import type { EmailOtpType } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
/** Same site: the same origin, or the same host with or without "www.". */
function originsMatch(requestOrigin: string, targetOrigin: string) {
  if (requestOrigin === targetOrigin) {
    return true;
  }

  const stripWww = (host: string) => host.replace(/^www\./, "");
  return (
    stripWww(new URL(requestOrigin).hostname) ===
    stripWww(new URL(targetOrigin).hostname)
  );
}

/** Resolve a safe in-app path from a `next` query param or redirect URL. */
export function resolveAuthNextPath(next: string | null, origin: string) {
  if (!next) {
    return null;
  }

  try {
    // Parsed the way a browser reads it: "/\evil.example" and "//evil.example" are other sites.
    const url = new URL(next, origin);
    // A path that starts with "//" is another site once it is used as a
    // redirect target: "https://this.site//evil.example" → "//evil.example".
    if (originsMatch(origin, url.origin) && !url.pathname.startsWith("//")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function isPasswordRecoveryFlow(
  type: EmailOtpType,
  next: string | null,
  origin: string
) {
  if (type === "recovery") {
    return true;
  }

  if (resolveAuthNextPath(next, origin) === "/login/reset-password") {
    return true;
  }

  if (!next) {
    return false;
  }

  try {
    const url = new URL(next, origin);
    const nestedNext = url.searchParams.get("next");
    if (resolveAuthNextPath(nestedNext, origin) === "/login/reset-password") {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function resolveAuthConfirmDestination(
  type: EmailOtpType,
  next: string | null,
  origin: string
) {
  if (isPasswordRecoveryFlow(type, next, origin)) {
    return "/login/reset-password";
  }

  const nextPath = resolveAuthNextPath(next, origin);
  if (nextPath) {
    return nextPath;
  }

  return null;
}

export const AUTH_CONFIRM_FINALIZE_PARAM = "finalize";

export function buildAuthConfirmPendingPath(params: {
  tokenHash: string;
  type: EmailOtpType;
  next?: string | null;
}) {
  const search = new URLSearchParams({
    token_hash: params.tokenHash,
    type: params.type,
  });

  if (params.next) {
    search.set("next", params.next);
  }

  return `/auth/confirm/pending?${search.toString()}`;
}

export function buildAuthConfirmVerifyPath(params: {
  tokenHash: string;
  type: EmailOtpType;
  next?: string | null;
}) {
  const search = new URLSearchParams({
    token_hash: params.tokenHash,
    type: params.type,
    [AUTH_CONFIRM_FINALIZE_PARAM]: "1",
  });

  if (params.next) {
    search.set("next", params.next);
  }

  return `/auth/confirm?${search.toString()}`;
}

export async function verifyEmailTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
  type: EmailOtpType
) {
  const primary = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (!primary.error) {
    return { ...primary, verifiedType: type };
  }

  const alternateTypes: EmailOtpType[] = [];
  if (type === "email") {
    alternateTypes.push("signup");
  } else if (type === "signup") {
    alternateTypes.push("email");
  }

  if (type === "recovery") {
    alternateTypes.push("email");
  } else {
    alternateTypes.push("recovery");
  }

  for (const alternateType of alternateTypes) {
    const retry = await supabase.auth.verifyOtp({
      type: alternateType,
      token_hash: tokenHash,
    });

    if (!retry.error) {
      return { ...retry, verifiedType: alternateType };
    }
  }

  return { ...primary, verifiedType: type };
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
