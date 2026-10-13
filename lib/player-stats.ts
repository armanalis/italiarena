/** Numbers from a player's stats row, shared by the Stats page and the Arena summary. */
import { formatCategoryLabel } from "@/lib/scoring";
import type { PlayerStats, QuestionCategory } from "@/types/database.types";

/** "74%", or "—" before anything was counted. */
export function pct(correct: number, total: number) {
  if (total === 0) {
    return "—";
  }
  return `${Math.round((correct / total) * 100)}%`;
}

/** Right and total answers for each question type. */
export function categoryResults(stats: PlayerStats): {
  key: QuestionCategory;
  label: string;
  correct: number;
  total: number;
}[] {
  return [
    { key: "grammar", correct: stats.grammar_correct, total: stats.grammar_total },
    { key: "vocabulary", correct: stats.vocab_correct, total: stats.vocab_total },
    { key: "fill-in-the-blank", correct: stats.fill_blank_correct, total: stats.fill_blank_total },
    { key: "idioms", correct: stats.idioms_correct, total: stats.idioms_total },
  ].map((row) => ({ ...row, key: row.key as QuestionCategory, label: formatCategoryLabel(row.key) }));
}

export function overallAccuracy(stats: PlayerStats) {
  const rows = categoryResults(stats);
  return pct(
    rows.reduce((sum, row) => sum + row.correct, 0),
    rows.reduce((sum, row) => sum + row.total, 0)
  );
}
