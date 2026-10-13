/** Sidebar shell for every signed-in page. Auth enforced in middleware. */
import { AuroraCanvas } from "@/components/aurora-canvas";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OnlineHeartbeat } from "@/components/dashboard/online-players";
import { getAuthUserId } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Visitors only get this far on "/" (middleware sends them to /login
  // everywhere else): the landing page, without the sidebar.
  if (!(await getAuthUserId())) {
    return children;
  }

  return (
    <AuroraCanvas subtle className="flex h-app min-h-0 w-full flex-col overflow-hidden md:flex-row">
      <OnlineHeartbeat />
      <DashboardShell>{children}</DashboardShell>
    </AuroraCanvas>
  );
}
