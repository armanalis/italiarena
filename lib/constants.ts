/**
 * Languages the app teaches, stored by these names in users.target_language and
 * every `language` column. KEEP IN SYNC with supabase/multi-language-*.sql.
 */
export const TARGET_LANGUAGES = ["Italian", "German"] as const;
/** Rows and players from before German existed are Italian. */
export const DEFAULT_LANGUAGE = "Italian" satisfies (typeof TARGET_LANGUAGES)[number];

/** `code` is for lang attributes; `label` is the language's own name. */
export const LANGUAGE_META = {
  Italian: { code: "it", label: "Italiano" },
  German: { code: "de", label: "Deutsch" },
} as const satisfies Record<(typeof TARGET_LANGUAGES)[number], { code: string; label: string }>;

export function isTargetLanguage(value: unknown): value is TargetLanguage {
  return TARGET_LANGUAGES.includes(value as TargetLanguage);
}

/**
 * For players who never saved their own: the players are in Italy, and the
 * Wordle and Passaparola day starts at midnight here too.
 * KEEP IN SYNC with the users.timezone default (supabase/audit-3-fixes-2026-10-15.sql).
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
] as const;

export type TargetLanguage = (typeof TARGET_LANGUAGES)[number];
export type ProficiencyLevel = (typeof PROFICIENCY_LEVELS)[number];

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/armanalis";
