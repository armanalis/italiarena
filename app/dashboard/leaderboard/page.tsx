/** Leaderboard — PvP rankings by language and proficiency bracket. */
import { getLeaderboard } from "@/app/dashboard/leaderboard/actions";
import { LeaderboardDashboard } from "@/components/leaderboard/leaderboard-dashboard";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function LeaderboardPage() {
  const profile = await requireOnboardingComplete();

  const data = await getLeaderboard(
    profile.target_language!,
    profile.proficiency_level!
  );

  return <LeaderboardDashboard data={data} />;
}
