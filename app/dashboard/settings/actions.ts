"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordMatchMistakes } from "@/app/dashboard/statistics/actions";
import { getCurrentUserProfile, getAuthUserId } from "@/lib/auth";
import {
  cachedDashboardQuery,
  dashboardTag,
  revalidateUserDashboard,
} from "@/lib/dashboard-cache";
import { createClient } from "@/utils/supabase/server";
import {
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGE,
  type ProficiencyLevel,
  type TargetLanguage,
} from "@/lib/constants";
import type { CategoryProgress, MatchHistoryEntry } from "@/lib/types";
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
import type {
  CorrectAnswer,
  MatchResult,
  OpponentType,
  PlayerStats,
} from "@/types/database.types";

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

      return {
        profile,
        recentMatches: (recentMatches ?? []) as MatchHistoryEntry[],
      };
    }
  );
}

export async function updateLearningProfile(formData: FormData): Promise<SettingsActionResult> {
  const proficiencyLevel = String(formData.get("proficiency_level") ?? "");
  const displayName = normalizeUsername(String(formData.get("display_name") ?? ""));

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
      target_language: TARGET_LANGUAGE,
      proficiency_level: proficiencyLevel,
      display_name: displayName,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: mapUsernameSaveError(error) };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidateUserDashboard(user.id);
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

  revalidatePath("/dashboard/settings");
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

  revalidatePath("/dashboard/settings");
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

export async function saveMatchResult(payload: {
  sessionId: string;
  userScore: number;
  opponentScore: number;
  result: MatchResult;
  opponentType: OpponentType;
  opponentDisplayName: string;
  language: string;
  level: string;
  categoryProgress: CategoryProgress;
  questionIds: string[];
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

  // The score, result, and opponent type are no longer trusted from the
  // client here — finalize_match_result derives them server-side from the
  // session's own score_state (written incrementally as the match was
  // played) and rejects sessions the caller wasn't a participant in.
  // See supabase/match-result-integrity-migration.sql.
  const { error: finalizeError } = await supabase.rpc("finalize_match_result", {
    p_session_id: payload.sessionId,
    p_opponent_display_name: payload.opponentDisplayName,
    p_question_ids: payload.questionIds,
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

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/statistics");
  revalidatePath("/dashboard/recent-matches");
  revalidatePath("/dashboard/leaderboard");
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
