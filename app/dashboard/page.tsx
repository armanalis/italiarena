import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { PlayDashboardContent } from "@/app/dashboard/play-dashboard-content";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={2} />}>
      <PlayDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
