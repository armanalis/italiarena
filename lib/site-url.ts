/** Resolve the public site origin for OAuth and email redirects. */
export const PRODUCTION_SITE_URL = "https://italiarena.com";

/** Legacy hosts that should permanently redirect to {@link PRODUCTION_SITE_URL}. */
export const LEGACY_SITE_HOSTNAMES = [
  "language-quiz-one.vercel.app",
  "quiz-one.vercel.app",
] as const;

export function normalizeSiteUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function isLocalDevHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isLegacySiteHostname(hostname: string) {
  if ((LEGACY_SITE_HOSTNAMES as readonly string[]).includes(hostname)) {
    return true;
  }

  return (
    hostname.endsWith(".vercel.app") &&
    (hostname.includes("language-quiz") || hostname.includes("quiz-one"))
  );
}

/** Vercel preview aliases and legacy project URLs should hit italiarena.com. */
export function shouldRedirectToProductionHost(hostname: string) {
  if (isLocalDevHostname(hostname)) {
    return false;
  }

  if (hostname === "italiarena.com" || hostname === "www.italiarena.com") {
    return false;
  }

  return isLegacySiteHostname(hostname) || hostname.endsWith(".vercel.app");
}

function isLegacySiteUrl(url: string) {
  try {
    const hostname = new URL(url).hostname;
    return (
      isLegacySiteHostname(hostname) || hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

/** Canonical origin for auth redirects and emailed links in deployed environments. */
export function getCanonicalSiteUrl() {
  const defaultUrl = getDefaultSiteUrl();
  if (defaultUrl.includes("localhost") || defaultUrl.includes("127.0.0.1")) {
    return defaultUrl;
  }
  return getProductionSiteUrl();
}

export function getDefaultSiteUrl() {
  const fromEnv = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );

  if (fromEnv.includes("localhost") || fromEnv.includes("127.0.0.1")) {
    return fromEnv;
  }

  if (isLegacySiteUrl(fromEnv)) {
    return getProductionSiteUrl();
  }

  return fromEnv;
}

export function getProductionSiteUrl() {
  return normalizeSiteUrl(PRODUCTION_SITE_URL);
}

export function getAuthCallbackUrl(origin: string) {
  return `${normalizeSiteUrl(origin)}/auth/callback`;
}

/** Email confirmation and password-reset links always use the canonical site URL. */
export function getEmailAuthCallbackUrl(nextPath?: string) {
  const callback = getAuthCallbackUrl(getCanonicalSiteUrl());
  if (!nextPath) {
    return callback;
  }
  return `${callback}?next=${encodeURIComponent(nextPath)}`;
}

/** OAuth callback target: localhost in dev, canonical production URL otherwise. */
export function getClientAuthCallbackUrl() {
  if (typeof window !== "undefined") {
    if (isLocalDevHostname(window.location.hostname)) {
      return getAuthCallbackUrl(window.location.origin);
    }
    return getAuthCallbackUrl(getProductionSiteUrl());
  }

  return getAuthCallbackUrl(getCanonicalSiteUrl());
}

export function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

export function resolveCanonicalOriginForHostname(hostname: string) {
  if (isLocalDevHostname(hostname)) {
    return null;
  }

  if (shouldRedirectToProductionHost(hostname)) {
    return getProductionSiteUrl();
  }

  return null;
}
