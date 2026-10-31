/** Daily Wordle: one puzzle per language, level and day, plus the archive. */
import { WordleGame } from "@/components/wordle/wordle-game";
import { requireOnboardingComplete } from "@/lib/auth";
import { DEFAULT_LANGUAGE, languageFromCode, PROFICIENCY_LEVELS } from "@/lib/constants";
import { italyToday, playWordle } from "@/lib/wordle";
import { createClient } from "@/utils/supabase/server";

export default async function WordlePage({
  searchParams,
}: {
  // A shared result links to its puzzle: /wordle?lang=de&level=A2&day=2026-10-13
  // (links from before German have no lang and are Italian).
  searchParams: Promise<{ lang?: string; level?: string; day?: string }>;
}) {
  const profile = await requireOnboardingComplete();
  const { lang, level: sharedLevel, day: sharedDay } = await searchParams;
  const supabase = await createClient();
  const sharedLanguage = lang ? languageFromCode(lang) : DEFAULT_LANGUAGE;

  const shared =
    sharedLanguage && sharedLevel && sharedDay && (PROFICIENCY_LEVELS as readonly string[]).includes(sharedLevel)
      ? await playWordle(supabase, sharedLanguage, sharedLevel, sharedDay, null)
      : null;
  // A bad or future day in the link falls back to the player's own puzzle of the day.
  const language = shared?.ok ? sharedLanguage! : profile.target_language ?? DEFAULT_LANGUAGE;
  const level = shared?.ok ? sharedLevel! : profile.proficiency_level!;
  const initial = shared?.ok ? shared : await playWordle(supabase, language, level, italyToday(), null);

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      {/* key: a language switch from the header must start a fresh game, not keep the old board. */}
      <WordleGame key={language} language={language} initialLevel={level} initial={initial} />
    </main>
  );
}
