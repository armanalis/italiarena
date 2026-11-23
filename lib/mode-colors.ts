/** One color per difficulty, the same in every game: green is Normal, red is Hard. */
export type PlayMode = "normal" | "hard";

/** Mode word, e.g. "· Hard" next to a score. */
export const modeText: Record<PlayMode, string> = {
  normal: "text-emerald-600 dark:text-emerald-400",
  hard: "text-rose-600 dark:text-rose-400",
};

/** A played day card in the archive. */
export const modeCard: Record<PlayMode, string> = {
  normal: "border-emerald-500/50 bg-emerald-500/10",
  hard: "border-rose-500/50 bg-rose-500/10",
};

/** The chosen chip of a Normal/Hard picker. */
export const modeChip: Record<PlayMode, string> = {
  normal: "border-emerald-600 bg-emerald-600 text-white",
  hard: "border-rose-600 bg-rose-600 text-white",
};
