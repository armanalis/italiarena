/** Languages and proficiency levels shown during onboarding and used for matchmaking. */
export const TARGET_LANGUAGES = ["English", "Italian", "Spanish"] as const;

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
