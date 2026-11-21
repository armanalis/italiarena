/**
 * Languages the app teaches, stored by these names in users.target_language and
 * every `language` column. KEEP IN SYNC with the language checks in the database.
 * Danish is implemented (letters, articles, keyboard) but not offered until its content exists.
 */
export const TARGET_LANGUAGES = ["Italian", "German", "English", "Spanish"] as const;
/** Ready in code, hidden from every picker until its content is live. */
export const UNLISTED_LANGUAGES = ["Danish"] as const;
/** Rows and players from before German existed are Italian. */
export const DEFAULT_LANGUAGE = "Italian" satisfies (typeof TARGET_LANGUAGES)[number];

export type TargetLanguage = (typeof TARGET_LANGUAGES)[number];
export type KnownLanguage = TargetLanguage | (typeof UNLISTED_LANGUAGES)[number];

/** `code` is for lang attributes; `label` is the language's own name. */
export const LANGUAGE_META = {
  Italian: { code: "it", label: "Italiano" },
  German: { code: "de", label: "Deutsch" },
  English: { code: "en", label: "English" },
  Spanish: { code: "es", label: "Español" },
  Danish: { code: "da", label: "Dansk" },
} as const satisfies Record<KnownLanguage, { code: string; label: string }>;

export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return (TARGET_LANGUAGES as readonly string[]).includes(value as string);
}

export function isKnownLanguage(value: unknown): value is KnownLanguage {
  return isTargetLanguage(value) || (UNLISTED_LANGUAGES as readonly string[]).includes(value as string);
}

/** The language with this `code`, as in ?lang=de links. */
export function languageFromCode(code: string | undefined): TargetLanguage | undefined {
  return TARGET_LANGUAGES.find((language) => LANGUAGE_META[language].code === code);
}

/**
 * For players who never saved their own: the players are in Italy, and the
 * Wordle and Passaparola day starts at midnight here too.
 * KEEP IN SYNC with the database default of users.timezone.
 */
export const DEFAULT_TIMEZONE = "Europe/Rome";

export const PROFICIENCY_LEVELS = [
  "A1",
  "A1-A2",
  "A2",
  "A2-B1",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export function isProficiencyLevel(value: unknown): value is ProficiencyLevel {
  return PROFICIENCY_LEVELS.includes(value as ProficiencyLevel);
}

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/armanalis";
