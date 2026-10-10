/** Shared dashboard shell with sidebar navigation. Auth enforced in middleware. */
import { AuroraCanvas } from "@/components/aurora-canvas";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OnlineHeartbeat } from "@/components/dashboard/online-players";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuroraCanvas subtle className="flex h-app min-h-0 w-full flex-col overflow-hidden md:flex-row">
      <OnlineHeartbeat />
      <DashboardShell>{children}</DashboardShell>
    </AuroraCanvas>
  );
}
