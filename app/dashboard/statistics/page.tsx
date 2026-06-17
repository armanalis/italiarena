import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { StatisticsContent } from "@/app/dashboard/statistics/statistics-content";

export default function StatisticsPage() {
  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={3} />}>
      <StatisticsContent />
    </Suspense>
  );
}
