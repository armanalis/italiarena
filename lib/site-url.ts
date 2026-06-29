/** Resolve the public site origin for OAuth and email redirects. */
export const PRODUCTION_SITE_URL = "https://italiarena.com";

/** Legacy hosts that should permanently redirect to {@link PRODUCTION_SITE_URL}. */
export const LEGACY_SITE_HOSTNAMES = ["language-quiz-one.vercel.app"] as const;

export function normalizeSiteUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function getDefaultSiteUrl() {
  return normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );
}

export function getProductionSiteUrl() {
  return normalizeSiteUrl(PRODUCTION_SITE_URL);
}

export function getAuthCallbackUrl(origin: string) {
  return `${normalizeSiteUrl(origin)}/auth/callback`;
}

/** Client-side OAuth callback: always use the tab the user is on. */
export function getClientAuthCallbackUrl() {
  if (typeof window !== "undefined") {
    return getAuthCallbackUrl(window.location.origin);
  }
  return getAuthCallbackUrl(getDefaultSiteUrl());
}

export function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}
