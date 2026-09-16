/**
 * Consent state for non-essential (analytics) device storage.
 *
 * Art. 122 Codice privacy + Garante guidelines of 10 June 2021: analytics that
 * is not strictly necessary needs prior, explicit, freely-given consent, and
 * withdrawing it must be as easy as giving it. Nothing analytics-related may be
 * loaded while the state is "unknown".
 *
 * Storing the choice itself is technical storage and needs no consent.
 */

export type CookieConsentChoice = "granted" | "denied";

/** null = not asked yet, so the banner shows and analytics stays off. */
export type CookieConsentState = CookieConsentChoice | null;

export const COOKIE_CONSENT_STORAGE_KEY = "lq-cookie-consent";

/** Bump when a new non-essential tool is added, to re-ask everyone. */
export const COOKIE_CONSENT_VERSION = 1;

type StoredConsent = {
  choice: CookieConsentChoice;
  version: number;
  decidedAt: string;
};

function readStored(): StoredConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.choice !== "granted" && parsed.choice !== "denied") {
      return null;
    }
    // A stale version means the disclosure changed: ask again.
    if (parsed.version !== COOKIE_CONSENT_VERSION) {
      return null;
    }

    return {
      choice: parsed.choice,
      version: parsed.version,
      decidedAt: parsed.decidedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function readCookieConsent(): CookieConsentState {
  return readStored()?.choice ?? null;
}

export function getCookieConsentDecidedAt(): string | null {
  return readStored()?.decidedAt || null;
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other tabs of the same browser in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key === COOKIE_CONSENT_STORAGE_KEY) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const cookieConsentStore = {
  subscribe,
  getSnapshot: readCookieConsent,
  /** The server cannot know the choice; render as "not asked" and settle on hydration. */
  getServerSnapshot: (): CookieConsentState => null,
};

/** Clears the first-party cookies Clarity writes. Its own clarity.ms cookies are out of reach. */
function clearAnalyticsCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
  const hostname = window.location.hostname;
  // Clear on the exact host and on the registrable domain (Clarity may use either).
  const domains = [hostname, `.${hostname.split(".").slice(-2).join(".")}`];

  for (const name of ["_clck", "_clsk"]) {
    document.cookie = `${name}=; expires=${expired}; path=/`;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=${expired}; path=/; domain=${domain}`;
    }
  }
}

/**
 * Clarity changed its consent API between tag versions: v1 takes a boolean,
 * v2 takes a storage map. Sending both keeps the signal effective either way.
 */
function signalAnalyticsConsent(granted: boolean) {
  const clarity = window.clarity;
  if (typeof clarity !== "function") {
    return;
  }

  const state = granted ? "granted" : "denied";
  try {
    clarity("consent", granted);
    clarity("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: state,
    });
  } catch {
    // An old or partially loaded tag: nothing more we can do from here.
  }
}

export function setCookieConsent(choice: CookieConsentChoice) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({
        choice,
        version: COOKIE_CONSENT_VERSION,
        decidedAt: new Date().toISOString(),
      } satisfies StoredConsent)
    );
  } catch {
    // Private mode or a full quota: honour the choice for this page session only.
  }

  if (choice === "denied") {
    // Tell an already-running tag to stop, then remove what it wrote.
    signalAnalyticsConsent(false);
    clearAnalyticsCookies();
  }

  notify();
}

/** Re-opens the banner so the user can change a previous answer. */
export function resetCookieConsent() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    // ignore
  }

  signalAnalyticsConsent(false);
  clearAnalyticsCookies();
  notify();
}
