/**
 * Auth helpers used across server components.
 * Loads the current user profile and handles redirects for protected routes.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { UserProfile, UserRole } from "@/lib/types";

async function fetchUserRow(userId: string) {
  const supabase = await createClient();

  const withRole = await supabase
    .from("users")
    .select(
      "id, email, display_name, target_language, proficiency_level, role, sound_enabled, haptics_enabled"
    )
    .eq("id", userId)
    .maybeSingle();

  if (!withRole.error && withRole.data) {
    return withRole.data;
  }

  const withoutExtras = await supabase
    .from("users")
    .select("id, email, target_language, proficiency_level, role")
    .eq("id", userId)
    .maybeSingle();

  if (!withoutExtras.error && withoutExtras.data) {
    return {
      ...withoutExtras.data,
      display_name: null,
      sound_enabled: true,
      haptics_enabled: true,
    };
  }

  const withoutRole = await supabase
    .from("users")
    .select("id, email, target_language, proficiency_level")
    .eq("id", userId)
    .maybeSingle();

  if (withoutRole.error || !withoutRole.data) {
    return null;
  }

  return {
    ...withoutRole.data,
    display_name: null,
    role: "user" as UserRole,
    sound_enabled: true,
    haptics_enabled: true,
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await fetchUserRow(user.id);

  if (profile) {
    return {
      ...(profile as UserProfile),
      display_name: profile.display_name ?? null,
      role: (profile.role as UserRole | undefined) ?? "user",
      sound_enabled: profile.sound_enabled ?? true,
      haptics_enabled: profile.haptics_enabled ?? true,
    };
  }

  return {
    id: user.id,
    email: user.email ?? "",
    display_name: null,
    target_language: null,
    proficiency_level: null,
    role: "user",
    sound_enabled: true,
    haptics_enabled: true,
  };
}

export function isOnboardingComplete(profile: UserProfile) {
  return Boolean(profile.target_language && profile.proficiency_level);
}

/** Redirects to /login if the visitor is not signed in. */
export async function requireAuth() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
}

/** Where to send someone right after they authenticate. */
export async function getPostAuthPath(): Promise<"/dashboard" | "/onboarding"> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return "/onboarding";
  }

  return isOnboardingComplete(profile) ? "/dashboard" : "/onboarding";
}

/** Redirects to /onboarding if the user has not picked a language and level yet. */
export async function requireOnboardingComplete() {
  const profile = await requireAuth();

  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return profile;
}

/** Redirects non-admin users to the dashboard with an access-denied flag. */
export async function requireAdmin() {
  const profile = await requireOnboardingComplete();

  if (profile.role !== "admin") {
    redirect("/dashboard?error=admin_access_denied");
  }

  return profile;
}
