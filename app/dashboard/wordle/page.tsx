/** Daily Italian Wordle: one puzzle per level per day, plus the archive. */
import { WordleGame } from "@/components/wordle/wordle-game";
import { requireOnboardingComplete } from "@/lib/auth";
import { italyToday, playWordle } from "@/lib/wordle";
import { createClient } from "@/utils/supabase/server";

export default async function WordlePage() {
  const profile = await requireOnboardingComplete();
  const level = profile.proficiency_level!;
  const initial = await playWordle(await createClient(), level, italyToday(), null);

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      <WordleGame initialLevel={level} initial={initial} />
    </main>
  );
}
