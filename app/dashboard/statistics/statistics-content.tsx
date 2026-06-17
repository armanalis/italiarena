import { getUserMistakes } from "@/app/dashboard/statistics/actions";
import { getPlayerStatistics } from "@/app/dashboard/settings/actions";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";

export async function StatisticsContent() {
  const [stats, mistakes] = await Promise.all([
    getPlayerStatistics(),
    getUserMistakes(),
  ]);

  return <StatisticsDashboard stats={stats} mistakes={mistakes} />;
}
