import type { EmailOtpType } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProductionSiteUrl } from "@/lib/site-url";

function hostnamesMatch(a: string, b: string) {
  const stripWww = (host: string) => host.replace(/^www\./, "");
  return stripWww(a) === stripWww(b);
}

function originsMatch(requestOrigin: string, targetOrigin: string) {
  if (requestOrigin === targetOrigin) {
    return true;
  }

  try {
    const requestUrl = new URL(requestOrigin);
    const targetUrl = new URL(targetOrigin);

    if (requestUrl.origin === targetUrl.origin) {
      return true;
    }

    if (hostnamesMatch(requestUrl.hostname, targetUrl.hostname)) {
      return true;
    }

    const productionOrigin = getProductionSiteUrl();
    return (
      requestUrl.origin === productionOrigin ||
      targetUrl.origin === productionOrigin
    );
  } catch {
    return false;
  }
}

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
    if (originsMatch(origin, url.origin)) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveAuthConfirmDestination(
  type: EmailOtpType,
  next: string | null,
  origin: string
) {
  const nextPath = resolveAuthNextPath(next, origin);
  if (nextPath) {
    return nextPath;
  }

  if (type === "recovery") {
    return "/login/reset-password";
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
    return primary;
  }

  const alternateTypes: EmailOtpType[] = [];
  if (type === "email") {
    alternateTypes.push("signup");
  } else if (type === "signup") {
    alternateTypes.push("email");
  }

  for (const alternateType of alternateTypes) {
    const retry = await supabase.auth.verifyOtp({
      type: alternateType,
      token_hash: tokenHash,
    });

    if (!retry.error) {
      return retry;
    }
  }

  return primary;
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
