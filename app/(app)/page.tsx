/** "/": the Arena for signed-in players, the landing page for visitors. */
import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { LandingPage } from "@/components/landing/landing-page";
import { PlayDashboardContent } from "@/app/(app)/play-dashboard-content";
import { getAuthUserId } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { linkedLanguage } from "@/lib/language-link";

type HomePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  if (!(await getAuthUserId())) {
    return <LandingPage language={(await linkedLanguage()) ?? DEFAULT_LANGUAGE} />;
  }

  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={2} />}>
      <PlayDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
