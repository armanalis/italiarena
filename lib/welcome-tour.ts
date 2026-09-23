/** Remembers whether this browser has seen the first-visit welcome tour. */

export const WELCOME_TOUR_STORAGE_KEY = "lq-welcome-tour";

/** Bump when the tour content changes enough that everyone should see it again. */
export const WELCOME_TOUR_VERSION = 1;

export function hasSeenWelcomeTour(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return (
      window.localStorage.getItem(WELCOME_TOUR_STORAGE_KEY) ===
      String(WELCOME_TOUR_VERSION)
    );
  } catch {
    // Storage blocked: don't nag on every visit.
    return true;
  }
}

export function markWelcomeTourSeen() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      WELCOME_TOUR_STORAGE_KEY,
      String(WELCOME_TOUR_VERSION)
    );
  } catch {
    // Private mode or a full quota: the tour may show again next visit.
  }
}

/** Lets Settings replay the tour on the next Play dashboard visit. */
export function resetWelcomeTour() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(WELCOME_TOUR_STORAGE_KEY);
  } catch {
    // ignore
  }
}
