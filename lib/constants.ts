/** App currently supports Italian only. */
export const TARGET_LANGUAGE = "Italian" as const;
export const TARGET_LANGUAGES = [TARGET_LANGUAGE] as const;

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
