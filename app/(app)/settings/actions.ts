"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordMatchMistakes } from "@/app/(app)/stats/actions";
import { getCurrentUserProfile, getAuthUserId } from "@/lib/auth";
import {
  cachedDashboardQuery,
  dashboardTag,
  revalidateUserDashboard,
} from "@/lib/dashboard-cache";
import { createClient } from "@/utils/supabase/server";
import {
  isTargetLanguage,
  PROFICIENCY_LEVELS,
  type ProficiencyLevel,
  type TargetLanguage,
} from "@/lib/constants";
import type { MatchHistoryEntry } from "@/lib/types";
import {
  isUsernameTaken,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
import {
  isSamePasswordError,
  SAME_PASSWORD_MESSAGE,
  validateNewPassword,
} from "@/lib/password-rules";
import { mapUsernameSaveError, USERNAME_TAKEN_MESSAGE } from "@/lib/username-errors";
import type { CorrectAnswer, PlayerStats } from "@/types/database.types";

export type SettingsActionResult =
  | { success: true; redirectTo?: string }
  | { success: false; error: string };

function isProficiencyLevel(value: string): value is ProficiencyLevel {
  return PROFICIENCY_LEVELS.includes(value as ProficiencyLevel);
}

export async function getSettingsData() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return cachedDashboardQuery(
    ["settings-data", profile.id],
    dashboardTag(profile.id, "settings"),
    async () => {
      const supabase = await createClient();
      const { data: recentMatches } = await supabase
        .from("match_history")
        .select("*")
        .eq("user_id", profile.id)
        .order("played_at", { ascending: false })
        .limit(10);
      // Separate query: until friends-last-seen-2026-10-15.sql runs, the column
      // is missing and this falls back to the default instead of failing.
      const { data: privacy } = await supabase
        .from("users")
        .select("show_last_seen")
        .eq("id", profile.id)
        .maybeSingle();

      return {
        profile,
        recentMatches: (recentMatches ?? []) as MatchHistoryEntry[],
        showLastSeen: privacy?.show_last_seen ?? true,
        languageLevels: await readLanguageLevels(profile.id),
      };
    }
  );
}

export async function updateLearningProfile(formData: FormData): Promise<SettingsActionResult> {
  const targetLanguage = String(formData.get("target_language") ?? "");
  const proficiencyLevel = String(formData.get("proficiency_level") ?? "");
  const displayName = normalizeUsername(String(formData.get("display_name") ?? ""));

  if (!isTargetLanguage(targetLanguage)) {
    return { success: false, error: "Choose a language." };
  }

  if (!isProficiencyLevel(proficiencyLevel)) {
    return { success: false, error: "Choose a valid proficiency level." };
  }

  if (!displayName) {
    return { success: false, error: "Username is required." };
  }

  const usernameError = validateUsername(displayName);
  if (usernameError) {
    return { success: false, error: usernameError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: existingProfile } = await supabase
    .from("users")
    .select("is_guest")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.is_guest) {
    return {
      success: false,
      error: "Guest accounts cannot change their profile. Sign up for a full account.",
    };
  }

  if (await isUsernameTaken(displayName, user.id)) {
    return { success: false, error: USERNAME_TAKEN_MESSAGE };
  }

  const { error } = await supabase
    .from("users")
    .update({
      target_language: targetLanguage,
      proficiency_level: proficiencyLevel,
      display_name: displayName,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: mapUsernameSaveError(error) };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  revalidateUserDashboard(user.id);
  return { success: true };
}

/**
 * The level the player last used in each language (users.language_levels,
 * kept by a trigger). Empty until multi-language-1-profile-2026-11.sql runs.
 */
async function readLanguageLevels(
  userId: string
): Promise<Partial<Record<TargetLanguage, ProficiencyLevel>>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("language_levels")
    .eq("id", userId)
    .maybeSingle();
  return (data?.language_levels as Partial<Record<TargetLanguage, ProficiencyLevel>> | null) ?? {};
}

export type SwitchLanguageResult = SettingsActionResult | { success: false; needsLevel: true };

/**
 * Makes `language` the one being played, at `level` or else the level last
 * used in it. With neither, nothing changes and the caller asks for a level.
 * Guests may switch too: it changes what they play, not their account.
 */
export async function switchLanguage(
  language: string,
  level?: string
): Promise<SwitchLanguageResult> {
  if (!isTargetLanguage(language)) {
    return { success: false, error: "Choose a language." };
  }
  if (level !== undefined && !isProficiencyLevel(level)) {
    return { success: false, error: "Choose a valid proficiency level." };
  }

  const userId = await getAuthUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated." };
  }

  const proficiencyLevel = level ?? (await readLanguageLevels(userId))[language];
  if (!proficiencyLevel) {
    return { success: false, needsLevel: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ target_language: language, proficiency_level: proficiencyLevel })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  revalidateUserDashboard(userId);
  return { success: true };
}

export async function updateGameplayPreferences(
  soundEnabled: boolean,
  hapticsEnabled: boolean
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("users")
    .update({
      sound_enabled: soundEnabled,
      haptics_enabled: hapticsEnabled,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidateUserDashboard(user.id);
  return { success: true };
}

export async function updateShowLastSeen(
  showLastSeen: boolean
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("users")
    .update({ show_last_seen: showLastSeen })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidateUserDashboard(user.id);
  return { success: true };
}

export async function updateDailyReminderPreferences(options: {
  enabled?: boolean;
  hour?: number;
  timezone?: string;
}): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: existingProfile } = await supabase
    .from("users")
    .select("is_guest")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.is_guest) {
    return {
      success: false,
      error: "Guest accounts cannot enable notifications. Sign up for a full account.",
    };
  }

  const updates: {
    daily_reminder_enabled?: boolean;
    daily_reminder_hour?: number;
    timezone?: string;
  } = {};

  if (typeof options.enabled === "boolean") {
    updates.daily_reminder_enabled = options.enabled;
  }

  if (
    typeof options.hour === "number" &&
    Number.isInteger(options.hour) &&
    options.hour >= 0 &&
    options.hour <= 23
  ) {
    updates.daily_reminder_hour = options.hour;
  } else if (options.hour !== undefined) {
    return { success: false, error: "Choose a valid reminder hour." };
  }

  if (typeof options.timezone === "string" && options.timezone.trim()) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: options.timezone });
      updates.timezone = options.timezone;
    } catch {
      return { success: false, error: "Could not save your timezone." };
    }
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "Nothing to update." };
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidateUserDashboard(user.id);
  return { success: true };
}

export async function changePassword(formData: FormData): Promise<SettingsActionResult> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "All password fields are required." };
  }

  const rules = validateNewPassword(newPassword, confirmPassword);
  if (!rules.ok) {
    return { success: false, error: rules.error };
  }

  if (newPassword === currentPassword) {
    return {
      success: false,
      error: SAME_PASSWORD_MESSAGE,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: existingProfile } = await supabase
    .from("users")
    .select("is_guest")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile?.is_guest) {
    return {
      success: false,
      error: "Guest accounts cannot change their password. Sign up for a full account.",
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { success: false, error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    if (isSamePasswordError(error.message)) {
      return { success: false, error: SAME_PASSWORD_MESSAGE };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function deleteAccount(formData: FormData): Promise<SettingsActionResult> {
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (confirmation !== "DELETE") {
    return { success: false, error: 'Type DELETE to confirm account removal.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase.rpc("delete_own_account");

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.auth.signOut();
  return { success: true, redirectTo: "/login" };
}

export async function getPlayerStatistics(): Promise<PlayerStats | null> {
  const userId = await getAuthUserId();

  if (!userId) {
    return null;
  }

  return cachedDashboardQuery(
    ["player-stats", userId],
    dashboardTag(userId, "statistics"),
    async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("player_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      return data as PlayerStats | null;
    }
  );
}

/** A forfeit is recorded by the database, so nothing else clears these caches. */
export async function refreshDashboardAfterMatch(): Promise<void> {
  const userId = await getAuthUserId();
  if (userId) {
    revalidateUserDashboard(userId);
  }
}

/** Score, result and opponent type are worked out on the server (finalize_match_result). */
export async function saveMatchResult(payload: {
  sessionId: string;
  opponentDisplayName: string;
  mistakes: Array<{
    questionId: string;
    selectedAnswer: CorrectAnswer | null;
  }>;
}): Promise<SettingsActionResult> {
  try {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error: finalizeError } = await supabase.rpc("finalize_match_result", {
    p_session_id: payload.sessionId,
    p_opponent_display_name: payload.opponentDisplayName,
    // Already marked as seen when the match was created or joined.
    p_question_ids: [],
  });

  if (finalizeError) {
    return { success: false, error: finalizeError.message };
  }

  const mistakeResult = await recordMatchMistakes(
    payload.sessionId,
    payload.mistakes
  );

  if (!mistakeResult.success) {
    return mistakeResult;
  }

  revalidatePath("/settings");
  revalidatePath("/stats");
  revalidatePath("/recent");
  revalidatePath("/leaderboard");
  revalidateUserDashboard(user.id);
  return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save match result.",
    };
  }
}
