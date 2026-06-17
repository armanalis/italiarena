"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGE,
  type ProficiencyLevel,
} from "@/lib/constants";
import { generateGuestDisplayName } from "@/lib/guest";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export type GuestFormState = {
  error: string | null;
  redirectTo?: string | null;
};

export async function startGuestSession(
  _prevState: GuestFormState,
  formData: FormData
): Promise<GuestFormState> {
  const proficiencyLevel = String(formData.get("proficiency_level") ?? "").trim();
  const acknowledged = formData.get("acknowledged") === "on";

  if (!acknowledged) {
    return { error: "Please read and accept the guest mode terms to continue." };
  }

  if (!PROFICIENCY_LEVELS.includes(proficiencyLevel as ProficiencyLevel)) {
    return { error: "Please select a valid proficiency level." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: "Guest mode is temporarily unavailable. Please try again later.",
    };
  }

  const displayName = generateGuestDisplayName();
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

  const userId = created.user.id;

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    await admin.auth.admin.deleteUser(userId);
    return { error: signInError.message };
  }

  const { error: profileError } = await supabase
    .from("users")
    .update({
      display_name: displayName,
      target_language: TARGET_LANGUAGE,
      proficiency_level: proficiencyLevel,
      is_guest: true,
    })
    .eq("id", userId);

  if (profileError) {
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");

  return { error: null, redirectTo: "/dashboard" };
}
