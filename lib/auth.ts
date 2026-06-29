/**
 * Auth helpers used across server components.
 * Loads the current user profile and handles redirects for protected routes.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { UserProfile, UserRole } from "@/lib/types";
import { isGuestAuthEmail, isGuestAuthUser } from "@/lib/guest-auth";

const fetchUserRow = cache(async (userId: string) => {
  const supabase = await createClient();

  const withRole = await supabase
    .from("users")
    .select(
      "id, email, display_name, target_language, proficiency_level, role, is_guest, sound_enabled, haptics_enabled"
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
      is_guest: false,
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
    is_guest: false,
    sound_enabled: true,
    haptics_enabled: true,
  };
});

export function isGuestUser(profile: UserProfile) {
  return profile.is_guest || isGuestAuthEmail(profile.email);
}

const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Cached per request — shared by header, layout, and pages. */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  const user = await getAuthUser();
  return user?.id ?? null;
});

export const getCurrentUserProfile = cache(async (): Promise<UserProfile | null> => {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const profile = await fetchUserRow(user.id);

  if (profile) {
    return {
      ...(profile as UserProfile),
      display_name: profile.display_name ?? null,
      role: (profile.role as UserRole | undefined) ?? "user",
      is_guest: profile.is_guest ?? false,
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
    is_guest: isGuestAuthUser(user),
    sound_enabled: true,
    haptics_enabled: true,
  };
});

export function isOnboardingComplete(profile: UserProfile) {
  return Boolean(profile.target_language && profile.proficiency_level);
}

/** Redirects to /login if the visitor is not signed in. */
export const requireAuth = cache(async () => {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return profile;
});

/** Where to send someone right after they authenticate. */
export async function getPostAuthPath(): Promise<
  "/dashboard" | "/onboarding" | "/guest"
> {
  const profile = await getCurrentUserProfile();
  const user = await getAuthUser();

  if (!profile) {
    return "/onboarding";
  }

  if (isOnboardingComplete(profile)) {
    return "/dashboard";
  }

  if (isGuestUser(profile) || (user && isGuestAuthUser(user))) {
    return "/guest";
  }

  return "/onboarding";
}

/** Redirects to /onboarding if the user has not picked a language and level yet. */
export const requireOnboardingComplete = cache(async () => {
  const profile = await requireAuth();

  if (!isOnboardingComplete(profile)) {
    const user = await getAuthUser();
    if (isGuestUser(profile) || (user && isGuestAuthUser(user))) {
      redirect("/guest");
    }
    redirect("/onboarding");
  }

  return profile;
});

/** Redirects non-admin users to the dashboard with an access-denied flag. */
export async function requireAdmin() {
  const profile = await requireOnboardingComplete();

  if (profile.role !== "admin") {
    redirect("/dashboard?error=admin_access_denied");
  }

  return profile;
}
