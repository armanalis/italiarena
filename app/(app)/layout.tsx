/** Sidebar shell for every signed-in page. Auth enforced in proxy.ts. */
import { AuroraCanvas } from "@/components/aurora-canvas";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OnlineHeartbeat } from "@/components/dashboard/online-players";
import { getAuthUserId, getCurrentUserProfile } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Visitors only get this far on "/" (proxy.ts sends them to /login
  // everywhere else): the landing page, without the sidebar.
  if (!(await getAuthUserId())) {
    return children;
  }

  // Cached for the request: the page reads the same profile.
  const profile = await getCurrentUserProfile();

  return (
    <AuroraCanvas subtle className="flex h-app min-h-0 w-full flex-col overflow-hidden md:flex-row">
      <OnlineHeartbeat />
      <DashboardShell language={profile?.target_language ?? DEFAULT_LANGUAGE}>{children}</DashboardShell>
    </AuroraCanvas>
  );
}
