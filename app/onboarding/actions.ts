/** Saves the user's language and proficiency choices after onboarding. */
"use server";

import { revalidatePath } from "next/cache";
import {
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGE,
  type ProficiencyLevel,
} from "@/lib/constants";
import {
  isUsernameTaken,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
import { createClient } from "@/utils/supabase/server";

export type OnboardingFormState = {
  error: string | null;
};

export async function saveOnboarding(
  formData: FormData
): Promise<OnboardingFormState> {
  const proficiencyLevel = String(formData.get("proficiency_level") ?? "").trim();
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  if (!PROFICIENCY_LEVELS.includes(proficiencyLevel as ProficiencyLevel)) {
    return { error: "Please select a valid proficiency level." };
  }

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to continue." };
  }

  if (await isUsernameTaken(username, user.id)) {
    return { error: "That username is already taken." };
  }

  const profilePayload = {
    id: user.id,
    email: user.email ?? "",
    target_language: TARGET_LANGUAGE,
    proficiency_level: proficiencyLevel,
    display_name: username,
  };

  const { data: existingProfile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const { error } = existingProfile
    ? await supabase
        .from("users")
        .update({
          email: profilePayload.email,
          target_language: TARGET_LANGUAGE,
          proficiency_level: proficiencyLevel,
          display_name: username,
        })
        .eq("id", user.id)
    : await supabase.from("users").insert(profilePayload);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/onboarding");

  return { error: null };
}

/** useFormState-compatible wrapper */
export async function completeOnboarding(
  _prevState: OnboardingFormState,
  formData: FormData
): Promise<OnboardingFormState> {
  return saveOnboarding(formData);
}
