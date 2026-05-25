/** Shared dashboard shell with sidebar navigation. Requires completed onboarding. */
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireOnboardingComplete();

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background md:flex-row">
      <DashboardShell profile={profile}>{children}</DashboardShell>
    </div>
  );
}
