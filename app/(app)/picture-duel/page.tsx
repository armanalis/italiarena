/** Picture Duel: pick a level and a topic, then share the link with a friend. */
import { PictureDuelSetup } from "@/components/picture-duel/picture-duel-setup";
import { requireOnboardingComplete } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { pictureLevelFor, type PictureTopic } from "@/lib/picture-duel";
import { createClient } from "@/utils/supabase/server";

export default async function PictureDuelPage() {
  const profile = await requireOnboardingComplete();
  const language = profile.target_language ?? DEFAULT_LANGUAGE;
  const { data } = await (await createClient()).rpc("picture_duel_topics", { p_language: language });

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      {/* key: a language switch from the header shows that language's topics. */}
      <PictureDuelSetup
        key={language}
        language={language}
        initialLevel={pictureLevelFor(profile.proficiency_level!)}
        topics={(data as PictureTopic[] | null) ?? []}
      />
    </main>
  );
}
