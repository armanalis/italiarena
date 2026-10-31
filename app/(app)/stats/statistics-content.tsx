import {
  getReportedQuestionIds,
  getUserMistakes,
} from "@/app/(app)/stats/actions";
import { getPlayerStatistics } from "@/app/(app)/settings/actions";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";
import { getCurrentUserProfile } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";

export async function StatisticsContent() {
  const [stats, mistakes, reportedQuestionIds, profile] = await Promise.all([
    getPlayerStatistics(),
    getUserMistakes(),
    getReportedQuestionIds(),
    getCurrentUserProfile(),
  ]);

  return (
    <StatisticsDashboard
      language={profile?.target_language ?? DEFAULT_LANGUAGE}
      stats={stats}
      mistakes={mistakes}
      reportedQuestionIds={reportedQuestionIds}
    />
  );
}
