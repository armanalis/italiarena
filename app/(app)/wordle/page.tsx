/** Daily Italian Wordle: one puzzle per level per day, plus the archive. */
import { WordleGame } from "@/components/wordle/wordle-game";
import { requireOnboardingComplete } from "@/lib/auth";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import { italyToday, playWordle } from "@/lib/wordle";
import { createClient } from "@/utils/supabase/server";

export default async function WordlePage({
  searchParams,
}: {
  // A shared result links to its puzzle: /wordle?level=A2&day=2026-10-13
  searchParams: Promise<{ level?: string; day?: string }>;
}) {
  const profile = await requireOnboardingComplete();
  const { level: sharedLevel, day: sharedDay } = await searchParams;
  const supabase = await createClient();

  const shared =
    sharedLevel && sharedDay && (PROFICIENCY_LEVELS as readonly string[]).includes(sharedLevel)
      ? await playWordle(supabase, sharedLevel, sharedDay, null)
      : null;
  // A bad or future day in the link falls back to the player's own puzzle of the day.
  const level = shared?.ok ? sharedLevel! : profile.proficiency_level!;
  const initial = shared?.ok ? shared : await playWordle(supabase, level, italyToday(), null);

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      <WordleGame initialLevel={level} initial={initial} />
    </main>
  );
}
