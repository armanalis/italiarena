/** der·die·das / il·lo·la: a scored 60-second Sprint per level and day, then practice. */
import { ArticleGame } from "@/components/articles/article-game";
import { loadArticleStats } from "@/lib/articles";
import { requireOnboardingComplete } from "@/lib/auth";
import { DEFAULT_LANGUAGE, languageFromCode, PROFICIENCY_LEVELS } from "@/lib/constants";
import { createClient } from "@/utils/supabase/server";

export default async function ArticlesPage({
  searchParams,
}: {
  // A shared result links to its language and level: /articles?lang=de&level=A2
  searchParams: Promise<{ lang?: string; level?: string }>;
}) {
  const profile = await requireOnboardingComplete();
  const { lang, level: sharedLevel } = await searchParams;
  const language = languageFromCode(lang) ?? profile.target_language ?? DEFAULT_LANGUAGE;
  const level =
    sharedLevel && (PROFICIENCY_LEVELS as readonly string[]).includes(sharedLevel)
      ? sharedLevel
      : profile.proficiency_level!;
  const stats = await loadArticleStats(await createClient(), language);

  return (
    <main className="w-full flex-1 p-4 sm:p-8 lg:px-10">
      {/* key: a language switch from the header must start fresh, not keep the old game. */}
      <ArticleGame key={language} language={language} initialLevel={level} initialStats={stats} />
    </main>
  );
}
