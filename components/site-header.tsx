import { getCurrentUserProfile } from "@/lib/auth";
import { getPublicDisplayName } from "@/lib/display-name";
import { createClient } from "@/utils/supabase/server";
import { SiteHeaderNav } from "@/components/site-header-nav";

/** Top navigation bar — auth actions always visible on the right. */
export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getCurrentUserProfile() : null;

  return (
    <SiteHeaderNav
      isAuthenticated={Boolean(user)}
      displayName={
        profile
          ? getPublicDisplayName(profile)
          : user?.email
            ? getPublicDisplayName({ email: user.email, display_name: null })
            : null
      }
      showDashboard={Boolean(
        profile?.target_language && profile?.proficiency_level
      )}
      isAdmin={profile?.role === "admin"}
    />
  );
}
