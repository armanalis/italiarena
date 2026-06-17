import { getCurrentUserProfile } from "@/lib/auth";
import { getPublicDisplayName } from "@/lib/display-name";
import { SiteHeaderNav } from "@/components/site-header-nav";

/** Top navigation bar — auth actions always visible on the right. */
export async function SiteHeader() {
  const profile = await getCurrentUserProfile();

  return (
    <SiteHeaderNav
      isAuthenticated={Boolean(profile)}
      displayName={
        profile
          ? getPublicDisplayName(profile)
          : null
      }
      showDashboard={Boolean(
        profile?.target_language && profile?.proficiency_level
      )}
      isAdmin={profile?.role === "admin"}
    />
  );
}
