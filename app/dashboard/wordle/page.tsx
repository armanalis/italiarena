/** Daily Italian Wordle: one puzzle per level per day, plus the archive. */
import { loadWordle } from "@/app/dashboard/wordle/actions";
import { WordleGame } from "@/components/wordle/wordle-game";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function WordlePage() {
  const profile = await requireOnboardingComplete();
  const level = profile.proficiency_level!;

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      <WordleGame initialLevel={level} initial={await loadWordle(level, null)} />
    </main>
  );
}
