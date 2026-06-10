import type { CategoryProgress } from "@/lib/types";

export const emptyCategoryProgress = (): CategoryProgress => ({
  grammar: { correct: 0, total: 0 },
  vocabulary: { correct: 0, total: 0 },
  "fill-in-the-blank": { correct: 0, total: 0 },
  idioms: { correct: 0, total: 0 },
});

/** Ensures all category keys exist (persisted state may be partial or from older builds). */
export function normalizeCategoryProgress(
  progress: CategoryProgress | undefined | null
): CategoryProgress {
  const base = emptyCategoryProgress();
  if (!progress || typeof progress !== "object") {
    return base;
  }

  return {
    grammar: progress.grammar ?? base.grammar,
    vocabulary: progress.vocabulary ?? base.vocabulary,
    "fill-in-the-blank":
      progress["fill-in-the-blank"] ?? base["fill-in-the-blank"],
    idioms: progress.idioms ?? base.idioms,
  };
}
