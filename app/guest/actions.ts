"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGE,
  type ProficiencyLevel,
} from "@/lib/constants";
import { generateGuestDisplayName } from "@/lib/guest";
import { isUsernameTaken } from "@/lib/username";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type GuestFormState = {
  error: string | null;
  redirectTo?: string | null;
};

async function saveGuestProfile(
  userId: string,
  email: string,
  displayName: string,
  proficiencyLevel: ProficiencyLevel
): Promise<string | null> {
  const supabase = await createClient();
  const baseProfile = {
    id: userId,
    email,
    display_name: displayName,
    target_language: TARGET_LANGUAGE,
    proficiency_level: proficiencyLevel,
  };

  const withGuest = { ...baseProfile, is_guest: true };

  const { error: updateError } = await supabase
    .from("users")
    .update(withGuest)
    .eq("id", userId);

  if (!updateError) {
    return null;
  }

  if (updateError.message.includes("is_guest")) {
    const { error: fallbackUpdateError } = await supabase
      .from("users")
      .update(baseProfile)
      .eq("id", userId);

    if (!fallbackUpdateError) {
      return null;
    }
  }

  const { error: upsertError } = await supabase.from("users").upsert(withGuest);
  if (!upsertError) {
    return null;
  }

  if (upsertError.message.includes("is_guest")) {
    const { error: fallbackUpsertError } = await supabase
      .from("users")
      .upsert(baseProfile);
    return fallbackUpsertError?.message ?? null;
  }

  return upsertError.message;
}

async function allocateGuestDisplayName(userId: string): Promise<string> {
  const primary = generateGuestDisplayName(userId);
  if (!(await isUsernameTaken(primary, userId))) {
    return primary;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateGuestDisplayName(randomUUID());
    if (!(await isUsernameTaken(candidate, userId))) {
      return candidate;
    }
  }

  throw new Error("Could not assign a unique guest name. Please try again.");
}

/** Called after the browser has already signed the user in (anonymous or sign-up). */
export async function completeGuestProfile(
  proficiencyLevel: string
): Promise<GuestFormState> {
  if (!PROFICIENCY_LEVELS.includes(proficiencyLevel as ProficiencyLevel)) {
    return { error: "Please select a valid proficiency level." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Guest sign-in did not complete. Please try again." };
  }

  const email =
    user.email?.trim() || `guest-${user.id}@guest.local`;
  let displayName: string;

  try {
    displayName = await allocateGuestDisplayName(user.id);
  } catch (error) {
    await supabase.auth.signOut();
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not assign a guest name. Please try again.",
    };
  }

  const profileError = await saveGuestProfile(
    user.id,
    email,
    displayName,
    proficiencyLevel as ProficiencyLevel
  );

  if (profileError) {
    await supabase.auth.signOut();
    return { error: profileError };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");

  return { error: null, redirectTo: "/dashboard" };
}

/**
 * Last-resort guest provisioning when browser anonymous/sign-up is unavailable.
 * Requires SUPABASE_SERVICE_ROLE_KEY on the server.
 */
export async function provisionGuestViaAdmin(): Promise<GuestFormState> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Guest sign-in is not available yet. Enable Anonymous sign-in in Supabase (Authentication → Providers), then try again.",
    };
  }

  const email = `guest-${randomUUID()}@guest.local`;
  const password = randomUUID();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: createError?.message ?? "Could not start a guest session." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: signInError.message };
  }

  return { error: null };
}
