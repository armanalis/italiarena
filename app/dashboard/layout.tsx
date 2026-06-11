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
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] min-h-0 w-full flex-col overflow-hidden bg-background md:h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))] md:flex-row lg:h-[calc(100dvh-4rem-env(safe-area-inset-top,0px))]">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
