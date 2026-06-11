/** Shared dashboard shell with sidebar navigation. Requires completed onboarding. */
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingComplete();

  return (
    <div className="flex h-app min-h-0 w-full flex-col overflow-hidden bg-background md:flex-row">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
