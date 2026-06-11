/** Personal match statistics — wins, losses, accuracy, and mistake practice. */
import { getUserMistakes } from "@/app/dashboard/statistics/actions";
import { getPlayerStatistics } from "@/app/dashboard/settings/actions";
import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function StatisticsPage() {
  await requireOnboardingComplete();

  const [stats, mistakes] = await Promise.all([
    getPlayerStatistics(),
    getUserMistakes(),
  ]);

  return <StatisticsDashboard stats={stats} mistakes={mistakes} />;
}
