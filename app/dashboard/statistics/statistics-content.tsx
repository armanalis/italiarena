import {
  getReportedQuestionIds,
  getUserMistakes,
} from "@/app/dashboard/statistics/actions";
import { getPlayerStatistics } from "@/app/dashboard/settings/actions";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";

export async function StatisticsContent() {
  const [stats, mistakes, reportedQuestionIds] = await Promise.all([
    getPlayerStatistics(),
    getUserMistakes(),
    getReportedQuestionIds(),
  ]);

  return (
    <StatisticsDashboard
      stats={stats}
      mistakes={mistakes}
      reportedQuestionIds={reportedQuestionIds}
    />
  );
}
