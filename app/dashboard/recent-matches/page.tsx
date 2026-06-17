import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { RecentMatchesContent } from "@/app/dashboard/recent-matches/recent-matches-content";

export default function RecentMatchesPage() {
  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={2} />}>
      <RecentMatchesContent />
    </Suspense>
  );
}
