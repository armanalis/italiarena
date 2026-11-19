import "server-only";

import { headers } from "next/headers";
import {
  getAuthCallbackUrl,
  getCanonicalSiteUrl,
  isLocalDevHostname,
  resolveCanonicalOriginForHostname,
} from "@/lib/site-url";

/** Server actions and routes: canonical production origin in deployed environments. */
export async function getServerSiteUrl() {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (host) {
    const hostname = host.split(":")[0] ?? host;
    const canonical = resolveCanonicalOriginForHostname(hostname);

    if (canonical) {
      return canonical;
    }

    const proto =
      headersList.get("x-forwarded-proto") ??
      (isLocalDevHostname(hostname) ? "http" : "https");

    return `${proto}://${host}`;
  }

  return getCanonicalSiteUrl();
}

export async function getServerAuthCallbackUrl(nextPath?: string) {
  const callback = getAuthCallbackUrl(await getServerSiteUrl());
  if (!nextPath) {
    return callback;
  }
  return `${callback}?next=${encodeURIComponent(nextPath)}`;
}
