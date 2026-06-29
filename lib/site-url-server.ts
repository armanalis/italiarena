import "server-only";

import { headers } from "next/headers";
import { getAuthCallbackUrl, getDefaultSiteUrl } from "@/lib/site-url";

/** Server actions and routes: prefer the live request host over a stale env URL. */
export async function getServerSiteUrl() {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto =
    headersList.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  return getDefaultSiteUrl();
}

export async function getServerAuthCallbackUrl(nextPath?: string) {
  const callback = getAuthCallbackUrl(await getServerSiteUrl());
  if (!nextPath) {
    return callback;
  }
  return `${callback}?next=${encodeURIComponent(nextPath)}`;
}
