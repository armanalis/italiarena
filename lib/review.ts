/**
 * Spaced review of mistakes (quiz questions and missed article-game nouns):
 * a mistake comes back tomorrow, then 3 days, a week and 2 weeks after each
 * right review; the 4th right review means learned. A wrong answer starts
 * over from tomorrow. Days are Italy days, like Wordle's.
 * The database resets the schedule when a mistake is made again
 * (user_mistakes_schedule, supabase/migrations/*_mistake_review.sql).
 * Tested by scripts/test-review.ts.
 */
import { addDays } from "@/lib/wordle";

/** Days until the next review after 0, 1, 2 and 3 right reviews. */
export const REVIEW_STEPS_DAYS = [1, 3, 7, 14] as const;
/** practice_streak counts right reviews; this many means learned. */
export const REVIEWS_TO_LEARN = REVIEW_STEPS_DAYS.length;

export type ReviewOutcome =
  | { learned: true }
  | { learned: false; streak: number; dueOn: string };

export function nextReview(
  state: { streak: number; dueOn: string },
  correct: boolean,
  today: string
): ReviewOutcome {
  if (!correct) {
    return { learned: false, streak: 0, dueOn: addDays(today, REVIEW_STEPS_DAYS[0]) };
  }
  // Right before its day: fine practice, but only reviews on different days count.
  if (state.dueOn > today) {
    return { learned: false, streak: state.streak, dueOn: state.dueOn };
  }
  const streak = state.streak + 1;
  return streak >= REVIEWS_TO_LEARN
    ? { learned: true }
    : { learned: false, streak, dueOn: addDays(today, REVIEW_STEPS_DAYS[streak]) };
}

/** About 20 seconds a mistake. */
export function reviewMinutes(count: number): number {
  return Math.max(1, Math.ceil((count * 20) / 60));
}

/** "tomorrow", "in 3 days", "on 14 Nov". */
export function whenDue(dueOn: string, today: string): string {
  const days = Math.round((Date.parse(dueOn) - Date.parse(today)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days === 7) return "in a week";
  if (days === 14) return "in 2 weeks";
  return `on ${new Date(`${dueOn}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
}
