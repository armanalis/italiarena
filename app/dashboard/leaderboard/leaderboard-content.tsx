import { getLeaderboard } from "@/app/dashboard/leaderboard/actions";
import { LeaderboardDashboard } from "@/components/leaderboard/leaderboard-dashboard";
import { getCurrentUserProfile, isGuestUser } from "@/lib/auth";

export async function LeaderboardContent() {
  const profile = await getCurrentUserProfile();

  if (!profile?.target_language || !profile.proficiency_level) {
    return null;
  }

  const data = await getLeaderboard(
    profile.target_language,
    profile.proficiency_level
  );

  return <LeaderboardDashboard data={data} isGuest={isGuestUser(profile)} />;
}
