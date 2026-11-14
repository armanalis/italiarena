import {
  getReportedQuestionIds,
  getUserMistakes,
} from "@/app/(app)/stats/actions";
import { getPlayerStatistics } from "@/app/(app)/settings/actions";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";
import { getCurrentUserProfile } from "@/lib/auth";
import { hasArticleGame, loadArticleStats } from "@/lib/articles";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { hasPrepositionCards } from "@/lib/preposition-cards";
import { italyToday } from "@/lib/wordle";
import { createClient } from "@/utils/supabase/server";

export async function StatisticsContent({ startReview }: { startReview: boolean }) {
  const [stats, mistakes, reportedQuestionIds, profile] = await Promise.all([
    getPlayerStatistics(),
    getUserMistakes(),
    getReportedQuestionIds(),
    getCurrentUserProfile(),
  ]);
  const language = profile?.target_language ?? DEFAULT_LANGUAGE;
  const supabase = await createClient();
  const showPrepositions = await hasPrepositionCards(language);
  const [articleStats, prepositionStats] = await Promise.all([
    hasArticleGame(language) ? loadArticleStats(supabase, language) : Promise.resolve(null),
    showPrepositions ? loadArticleStats(supabase, language, "preposition") : Promise.resolve(null),
  ]);

  return (
    <StatisticsDashboard
      language={language}
      articleStats={articleStats}
      prepositionStats={showPrepositions ? prepositionStats ?? { best: {}, today: {}, accuracy: {} } : null}
      stats={stats}
      mistakes={mistakes}
      reportedQuestionIds={reportedQuestionIds}
      today={italyToday()}
      startReview={startReview}
    />
  );
}
