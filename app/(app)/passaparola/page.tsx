/** Daily Italian Passaparola: one board of 21 clues per level per day. */
import { PassaparolaGame } from "@/components/passaparola/passaparola-game";
import { requireOnboardingComplete } from "@/lib/auth";
import { playPassaparola } from "@/lib/passaparola";
import { createClient } from "@/utils/supabase/server";

export default async function PassaparolaPage() {
  const profile = await requireOnboardingComplete();
  const level = profile.proficiency_level!;
  const initial = await playPassaparola(await createClient(), level);

  return (
    // Flex column so the answer bar can sit at the bottom like a chat box.
    <main className="flex w-full flex-1 flex-col p-4 sm:p-8 lg:px-10">
      <PassaparolaGame initialLevel={level} initial={initial} />
    </main>
  );
}
