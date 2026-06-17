import { getRecentMatchesWithQuestions } from "@/app/dashboard/recent-matches/actions";
import { RecentMatchesDashboard } from "@/components/recent-matches/recent-matches-dashboard";

export async function RecentMatchesContent() {
  const { matches, reportedQuestionIds } =
    await getRecentMatchesWithQuestions();

  return (
    <RecentMatchesDashboard
      matches={matches}
      reportedQuestionIds={reportedQuestionIds}
    />
  );
}
