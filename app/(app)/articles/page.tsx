/** der·die·das / il·lo·la: a scored 60-second Sprint per level and day, then practice. */
import { redirect } from "next/navigation";
import { ArticleGame } from "@/components/articles/article-game";
import { HowToPlay } from "@/components/how-to-play";
import { hasArticleGame, loadArticleStats, loadSprintHistory } from "@/lib/articles";
import { requireOnboardingComplete } from "@/lib/auth";
import { DEFAULT_LANGUAGE, isProficiencyLevel, languageFromCode } from "@/lib/constants";
import { tutorialSeen } from "@/lib/tutorial-progress";
import { isIsoDate } from "@/lib/wordle";
import { createClient } from "@/utils/supabase/server";

export default async function ArticlesPage({
  searchParams,
}: {
  // A shared result links to its language, level and day: /articles?lang=de&level=A2&day=2026-11-14
  searchParams: Promise<{ lang?: string; level?: string; day?: string }>;
}) {
  const profile = await requireOnboardingComplete();
  const { lang, level: sharedLevel, day: sharedDay } = await searchParams;
  const language = languageFromCode(lang) ?? profile.target_language ?? DEFAULT_LANGUAGE;
  if (!hasArticleGame(language)) redirect("/");
  const level =
    sharedLevel && isProficiencyLevel(sharedLevel)
      ? sharedLevel
      : profile.proficiency_level!;
  const supabase = await createClient();
  const [stats, history, seen] = await Promise.all([
    loadArticleStats(supabase, language),
    loadSprintHistory(supabase, language, level, "article"),
    tutorialSeen(supabase, "articles"),
  ]);

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      <HowToPlay game="articles" seen={seen} buttonClassName="mx-auto w-full max-w-lg">
        {/* key: a language switch from the header must start fresh, not keep the old game. */}
        <ArticleGame
          key={language}
          language={language}
          initialLevel={level}
          initialStats={stats}
          initialHistory={history}
          initialDay={isIsoDate(sharedDay) ? sharedDay : null}
        />
      </HowToPlay>
    </main>
  );
}
