import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/** Service-role client when configured; otherwise the authenticated server client. */
export async function getPrivilegedSupabase() {
  try {
    return createAdminClient();
  } catch {
    return createClient();
  }
}
