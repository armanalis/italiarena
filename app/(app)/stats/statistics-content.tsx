import {
  getReportedQuestionIds,
  getUserMistakes,
} from "@/app/(app)/stats/actions";
import { getPlayerStatistics } from "@/app/(app)/settings/actions";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";
import { getCurrentUserProfile } from "@/lib/auth";
import { hasArticleGame, hasIndefiniteGame, loadArticleStats } from "@/lib/articles";
import { DEFAULT_LANGUAGE, hasPrepositionGame } from "@/lib/constants";
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
  const [articleStats, indefiniteStats, prepositionStats] = await Promise.all([
    hasArticleGame(language) ? loadArticleStats(supabase, language) : Promise.resolve(null),
    hasIndefiniteGame(language) ? loadArticleStats(supabase, language, "indefinite") : Promise.resolve(null),
    hasPrepositionGame(language) ? loadArticleStats(supabase, language, "preposition") : Promise.resolve(null),
  ]);

  return (
    <StatisticsDashboard
      language={language}
      articleStats={articleStats}
      indefiniteStats={hasIndefiniteGame(language) ? (indefiniteStats ?? { best: {}, today: {}, accuracy: {} }) : null}
      prepositionStats={hasPrepositionGame(language) ? (prepositionStats ?? { best: {}, today: {}, accuracy: {} }) : null}
      stats={stats}
      mistakes={mistakes}
      reportedQuestionIds={reportedQuestionIds}
      today={italyToday()}
      startReview={startReview}
    />
  );
}
