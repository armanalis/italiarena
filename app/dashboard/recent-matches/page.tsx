/** Recent matches — last 10 games with full question breakdowns. */
import { getRecentMatchesWithQuestions } from "@/app/dashboard/recent-matches/actions";
import { RecentMatchesDashboard } from "@/components/recent-matches/recent-matches-dashboard";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function RecentMatchesPage() {
  await requireOnboardingComplete();
  const { matches, reportedQuestionIds } =
    await getRecentMatchesWithQuestions();

  return (
    <RecentMatchesDashboard
      matches={matches}
      reportedQuestionIds={reportedQuestionIds}
    />
  );
}
