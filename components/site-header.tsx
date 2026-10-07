import { getCurrentUserProfile } from "@/lib/auth";
import { formatDisplayName } from "@/lib/display-name";
import { getAdminQueueCounts } from "@/lib/admin-queue-counts";
import { SiteHeaderNav } from "@/components/site-header-nav";

/** Top navigation bar — auth actions always visible on the right. */
export async function SiteHeader() {
  const profile = await getCurrentUserProfile();
  const isAdmin = profile?.role === "admin";
  const adminQueueCount = isAdmin ? (await getAdminQueueCounts()).total : 0;

  return (
    <SiteHeaderNav
      isAuthenticated={Boolean(profile)}
      displayName={
        profile
          ? formatDisplayName(profile)
          : null
      }
      showDashboard={Boolean(
        profile?.target_language && profile?.proficiency_level
      )}
      isAdmin={isAdmin}
      adminQueueCount={adminQueueCount}
    />
  );
}
