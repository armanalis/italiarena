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
  const profile = {
    display_name: displayName,
    target_language: TARGET_LANGUAGE,
    proficiency_level: proficiencyLevel,
    is_guest: true,
  };

  // The sign-up trigger creates the row; insert only if it is missing.
  // (Players may not change `email` on an existing row.)
  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update(profile)
    .eq("id", userId)
    .select("id");

  if (updateError) {
    return updateError.message;
  }

  if (updated.length > 0) {
    return null;
  }

  const { error: insertError } = await supabase
    .from("users")
    .insert({ id: userId, email, ...profile });
  return insertError?.message ?? null;
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
