import {
  getReportedQuestionIds,
  getUserMistakes,
} from "@/app/(app)/stats/actions";
import { getPlayerStatistics } from "@/app/(app)/settings/actions";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";
import { getCurrentUserProfile } from "@/lib/auth";
import { loadArticleStats } from "@/lib/articles";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { createClient } from "@/utils/supabase/server";

export async function StatisticsContent() {
  const [stats, mistakes, reportedQuestionIds, profile] = await Promise.all([
    getPlayerStatistics(),
    getUserMistakes(),
    getReportedQuestionIds(),
    getCurrentUserProfile(),
  ]);
  const language = profile?.target_language ?? DEFAULT_LANGUAGE;
  const articleStats = await loadArticleStats(await createClient(), language);

  return (
    <StatisticsDashboard
      language={language}
      articleStats={articleStats}
      stats={stats}
      mistakes={mistakes}
      reportedQuestionIds={reportedQuestionIds}
    />
  );
}
