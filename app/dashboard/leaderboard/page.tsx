import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { LeaderboardContent } from "@/app/dashboard/leaderboard/leaderboard-content";

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={2} />}>
      <LeaderboardContent />
    </Suspense>
  );
}
