"use client";

import { useSyncExternalStore } from "react";
import { cookieConsentStore, type CookieConsentState } from "@/lib/cookie-consent";

/** Current analytics-consent choice; null until the user answers the banner. */
export function useCookieConsent(): CookieConsentState {
  return useSyncExternalStore(
    cookieConsentStore.subscribe,
    cookieConsentStore.getSnapshot,
    cookieConsentStore.getServerSnapshot
  );
}
