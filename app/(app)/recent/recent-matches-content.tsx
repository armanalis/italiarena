import { getRecentMatchesWithQuestions } from "@/app/(app)/recent/actions";
import { getCurrentUserProfile } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { RecentMatchesDashboard } from "@/components/recent-matches/recent-matches-dashboard";

export async function RecentMatchesContent() {
  const [{ matches, reportedQuestionIds }, profile] = await Promise.all([
    getRecentMatchesWithQuestions(),
    getCurrentUserProfile(),
  ]);

  return (
    <RecentMatchesDashboard
      language={profile?.target_language ?? DEFAULT_LANGUAGE}
      matches={matches}
      reportedQuestionIds={reportedQuestionIds}
    />
  );
}
