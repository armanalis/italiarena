/** "/": the Arena for signed-in players, the landing page for visitors. */
import { Suspense } from "react";
import { DashboardSectionSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { LandingPage } from "@/components/landing/landing-page";
import { hasDemoQuestions } from "@/lib/landing-demo-questions";
import { PlayDashboardContent } from "@/app/(app)/play-dashboard-content";
import { getAuthUserId } from "@/lib/auth";
import { headers } from "next/headers";
import { languageFromCode } from "@/lib/constants";
import { linkedLanguage } from "@/lib/language-link";

type HomePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  if (!(await getAuthUserId())) {
    // A /german-style link wins; else the browser's first language if we teach it; else English.
    const browser = (await headers()).get("accept-language")?.split(/[,;-]/)[0].trim().toLowerCase();
    const first = (await linkedLanguage()) ?? languageFromCode(browser) ?? "English";
    return <LandingPage language={hasDemoQuestions(first) ? first : "English"} />;
  }

  return (
    <Suspense fallback={<DashboardSectionSkeleton cards={2} />}>
      <PlayDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}
