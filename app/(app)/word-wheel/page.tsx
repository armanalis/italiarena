/** Word Wheel (called Passaparola in the code): one board per language, level and day (21 clues in Italian, 23 in German). */
import { PassaparolaGame } from "@/components/passaparola/passaparola-game";
import { requireOnboardingComplete } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { playPassaparola } from "@/lib/passaparola";
import { createClient } from "@/utils/supabase/server";

export default async function PassaparolaPage() {
  const profile = await requireOnboardingComplete();
  const language = profile.target_language ?? DEFAULT_LANGUAGE;
  const level = profile.proficiency_level!;
  const initial = await playPassaparola(await createClient(), language, level);

  return (
    // Flex column so the answer bar can sit at the bottom like a chat box.
    <main className="flex w-full flex-1 flex-col p-4 sm:p-8 lg:px-10">
      <PassaparolaGame language={language} initialLevel={level} initial={initial} />
    </main>
  );
}
