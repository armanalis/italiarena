/** Client-side gameplay preference cache (mirrors DB values from Settings). */
export type GameplayPreferences = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
};

export const PREFERENCES_STORAGE_KEY = "lq-gameplay-preferences";

export const DEFAULT_GAMEPLAY_PREFERENCES: GameplayPreferences = {
  soundEnabled: true,
  hapticsEnabled: true,
};

export function readGameplayPreferences(): GameplayPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_GAMEPLAY_PREFERENCES;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_GAMEPLAY_PREFERENCES;
    }

    const parsed = JSON.parse(raw) as Partial<GameplayPreferences>;
    return {
      soundEnabled: parsed.soundEnabled ?? true,
      hapticsEnabled: parsed.hapticsEnabled ?? true,
    };
  } catch {
    return DEFAULT_GAMEPLAY_PREFERENCES;
  }
}

export function writeGameplayPreferences(preferences: GameplayPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences)
  );
}

export function isSoundEnabled() {
  return readGameplayPreferences().soundEnabled;
}

export function isHapticsEnabled() {
  return readGameplayPreferences().hapticsEnabled;
}
