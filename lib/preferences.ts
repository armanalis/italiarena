/** Client-side gameplay preference cache (mirrors DB values from Settings). */
export type GameplayPreferences = {
  soundEnabled: boolean;
  soundVolume: number;
  hapticsEnabled: boolean;
};

export const PREFERENCES_STORAGE_KEY = "lq-gameplay-preferences";

export const DEFAULT_SOUND_VOLUME = 80;

export const DEFAULT_GAMEPLAY_PREFERENCES: GameplayPreferences = {
  soundEnabled: true,
  soundVolume: DEFAULT_SOUND_VOLUME,
  hapticsEnabled: true,
};

function clampVolume(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

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
      soundVolume: clampVolume(parsed.soundVolume ?? DEFAULT_SOUND_VOLUME),
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
    JSON.stringify({
      ...preferences,
      soundVolume: clampVolume(preferences.soundVolume),
    })
  );
}

export function isSoundEnabled() {
  return readGameplayPreferences().soundEnabled;
}

export function getSoundVolume() {
  return readGameplayPreferences().soundVolume;
}

export function getEffectiveSoundVolume() {
  const preferences = readGameplayPreferences();
  if (!preferences.soundEnabled) {
    return 0;
  }
  return preferences.soundVolume;
}

export function isHapticsEnabled() {
  return readGameplayPreferences().hapticsEnabled;
}
