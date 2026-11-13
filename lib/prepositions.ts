import type { TargetLanguage } from "@/lib/constants";

/** Named after the buttons. The same in every app language. */
export const PREPOSITION_GAME_NAME = {
  English: "in·on·at",
  Italian: "di·a·da",
  German: "in·an·auf",
} as const satisfies Record<TargetLanguage, string>;

/** KEEP IN SYNC with article_sprint_ms('preposition') in the database. */
export const PREPOSITION_MS = 90_000;

/**
 * Rule id → one English sentence, filled in by the content build.
 * An id that is not here is shown as nothing.
 */
export const PREPOSITION_RULES: Record<string, string> = {};
