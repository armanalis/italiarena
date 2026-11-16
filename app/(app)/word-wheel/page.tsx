/** Word Wheel (called Passaparola in the code): one board per language, level and day. */
import { HowToPlay } from "@/components/how-to-play";
import { PassaparolaGame } from "@/components/passaparola/passaparola-game";
import { requireOnboardingComplete } from "@/lib/auth";
import { DEFAULT_LANGUAGE, isProficiencyLevel, languageFromCode } from "@/lib/constants";
import { playPassaparola } from "@/lib/passaparola";
import { tutorialSeen } from "@/lib/tutorial-progress";
import { isIsoDate } from "@/lib/wordle";
import { createClient } from "@/utils/supabase/server";

export default async function PassaparolaPage({
  searchParams,
}: {
  // A shared result links to its board: /word-wheel?lang=it&level=A2&day=2026-11-14
  searchParams: Promise<{ lang?: string; level?: string; day?: string }>;
}) {
  const profile = await requireOnboardingComplete();
  const { lang, level: sharedLevel, day: sharedDay } = await searchParams;
  const supabase = await createClient();
  const sharedLanguage = lang ? languageFromCode(lang) : undefined;
  const seen = tutorialSeen(supabase, "word_wheel");
  const shared =
    sharedLanguage && sharedLevel && isIsoDate(sharedDay) && isProficiencyLevel(sharedLevel)
      ? await playPassaparola(supabase, sharedLanguage, sharedLevel, { date: sharedDay })
      : null;
  const language = shared?.ok ? sharedLanguage! : profile.target_language ?? DEFAULT_LANGUAGE;
  const level = shared?.ok ? sharedLevel! : profile.proficiency_level!;
  const initial = shared?.ok ? shared : await playPassaparola(supabase, language, level);

  return (
    // Flex column so the answer bar can sit at the bottom like a chat box.
    <main className="flex w-full flex-1 flex-col p-4 sm:p-8 lg:px-10">
      <HowToPlay game="word_wheel" seen={await seen} buttonClassName="mx-auto w-full max-w-4xl">
        {/* key: a language switch from the header must load that language's board, not keep the old one. */}
        <PassaparolaGame key={language} language={language} initialLevel={level} initial={initial} />
      </HowToPlay>
    </main>
  );
}
