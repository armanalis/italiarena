import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { StatisticsContent } from "@/app/(app)/stats/statistics-content";

export default async function StatisticsPage({
  searchParams,
}: {
  // ?review=1 from the home card or the daily reminder opens today's review.
  searchParams: Promise<{ review?: string }>;
}) {
  const { review } = await searchParams;
  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={3} />}>
      <StatisticsContent startReview={review === "1"} />
    </Suspense>
  );
}
