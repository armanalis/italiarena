import { createAdminClientOrNull } from "@/utils/supabase/admin";

export const EXISTING_EMAIL_MESSAGE =
  "This email is already registered. Please sign in or try a different email.";

/** Server-only lookup for whether an email is already registered in auth or profiles. */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const trimmed = email.trim();
  if (!trimmed) {
    return false;
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    return false;
  }

  const { data: profileUser, error: profileError } = await admin
    .from("users")
    .select("id")
    .ilike("email", trimmed)
    .maybeSingle();

  if (profileError) {
    return false;
  }

  if (profileUser) {
    return true;
  }

  if (trimmed.length < 3) {
    return false;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return false;
  }

  try {
    const response = await fetch(
      `${url}/auth/v1/admin/users?filter=${encodeURIComponent(trimmed)}&per_page=1`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      users?: { email?: string; email_confirmed_at?: string | null }[];
    };
    const normalized = trimmed.toLowerCase();

    return (
      payload.users?.some(
        (user) =>
          user.email?.toLowerCase() === normalized &&
          Boolean(user.email_confirmed_at)
      ) ?? false
    );
  } catch {
    return false;
  }
}
