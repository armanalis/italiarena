/** Resolve the public site origin for OAuth and email redirects. */
export const PRODUCTION_SITE_URL = "https://italiarena.com";

/** Legacy hosts that should permanently redirect to {@link PRODUCTION_SITE_URL}. */
export const LEGACY_SITE_HOSTNAMES = ["language-quiz-one.vercel.app"] as const;

export function normalizeSiteUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function isLocalDevHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function isLegacySiteHostname(hostname: string) {
  return (LEGACY_SITE_HOSTNAMES as readonly string[]).includes(hostname);
}

function isLegacySiteUrl(url: string) {
  try {
    return isLegacySiteHostname(new URL(url).hostname);
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

function getClientSiteOrigin() {
  if (typeof window !== "undefined") {
    if (isLocalDevHostname(window.location.hostname)) {
      return normalizeSiteUrl(window.location.origin);
    }
    return getProductionSiteUrl();
  }

  return getCanonicalSiteUrl();
}

/** OAuth callback target: localhost in dev, canonical production URL otherwise. */
export function getClientAuthCallbackUrl() {
  return getAuthCallbackUrl(getClientSiteOrigin());
}

/** Post-confirmation destination for email sign-up and resend flows. */
export function getClientEmailRedirectUrl(nextPath = "/onboarding") {
  const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${getClientSiteOrigin()}${path}`;
}

export function getRequestOrigin(request: Request) {
  return new URL(request.url).origin;
}

export function resolveCanonicalOriginForHostname(hostname: string) {
  if (isLocalDevHostname(hostname)) {
    return null;
  }

  if (
    hostname === "italiarena.com" ||
    hostname === "www.italiarena.com" ||
    isLegacySiteHostname(hostname) ||
    hostname.endsWith(".vercel.app")
  ) {
    return getProductionSiteUrl();
  }

  return null;
}
