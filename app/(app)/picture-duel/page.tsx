/** Picture Duel: pick a level and a topic, then share the link with a friend. */
import { HowToPlay } from "@/components/how-to-play";
import { PictureDuelSetup } from "@/components/picture-duel/picture-duel-setup";
import { requireOnboardingComplete } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { pictureLevelFor, type PictureTopic } from "@/lib/picture-duel";
import { tutorialSeen } from "@/lib/tutorial-progress";
import { createClient } from "@/utils/supabase/server";

export default async function PictureDuelPage() {
  const profile = await requireOnboardingComplete();
  const language = profile.target_language ?? DEFAULT_LANGUAGE;
  const supabase = await createClient();
  const { data } = await supabase.rpc("picture_duel_topics", { p_language: language });
  const seen = await tutorialSeen(supabase, "picture_duel");

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      <HowToPlay game="picture_duel" seen={seen} buttonClassName="mx-auto w-full max-w-lg">
        {/* key: a language switch from the header shows that language's topics. */}
        <PictureDuelSetup
          key={language}
          language={language}
          initialLevel={pictureLevelFor(profile.proficiency_level!)}
          topics={(data as PictureTopic[] | null) ?? []}
        />
      </HowToPlay>
    </main>
  );
}
