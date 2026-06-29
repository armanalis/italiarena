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
import { normalizeCategoryProgress } from "@/lib/category-progress";
import {
  isUsernameTaken,
  normalizeUsername,
  validateUsername,
} from "@/lib/username";
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

export async function changePassword(formData: FormData): Promise<SettingsActionResult> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { success: false, error: "All password fields are required." };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "New passwords do not match." };
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

  const categoryProgress = normalizeCategoryProgress(payload.categoryProgress);

  const { data: existing } = await supabase
    .from("match_history")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_id", payload.sessionId)
    .maybeSingle();

  const historyAlreadySaved = Boolean(existing);

  if (!historyAlreadySaved) {
    const { error: historyError } = await supabase.from("match_history").insert({
      user_id: user.id,
      session_id: payload.sessionId,
      opponent_type: payload.opponentType,
      opponent_display_name: payload.opponentDisplayName,
      user_score: payload.userScore,
      opponent_score: payload.opponentScore,
      result: payload.result,
      language: payload.language,
      level: payload.level,
    });

    if (historyError) {
      return { success: false, error: historyError.message };
    }

    const { data: stats } = await supabase
      .from("player_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const base = stats ?? {
      user_id: user.id,
      matches_played: 0,
      matches_won: 0,
      matches_lost: 0,
      grammar_correct: 0,
      grammar_total: 0,
      vocab_correct: 0,
      vocab_total: 0,
      fill_blank_correct: 0,
      fill_blank_total: 0,
      idioms_correct: 0,
      idioms_total: 0,
      seen_questions: [],
    };

    const won = payload.result === "win" ? 1 : 0;
    const lost = payload.result === "loss" ? 1 : 0;

    const { error: statsError } = await supabase.from("player_stats").upsert({
      user_id: user.id,
      matches_played: base.matches_played + 1,
      matches_won: base.matches_won + won,
      matches_lost: base.matches_lost + lost,
      grammar_correct:
        base.grammar_correct + categoryProgress.grammar.correct,
      grammar_total: base.grammar_total + categoryProgress.grammar.total,
      vocab_correct:
        base.vocab_correct + categoryProgress.vocabulary.correct,
      vocab_total: base.vocab_total + categoryProgress.vocabulary.total,
      fill_blank_correct:
        base.fill_blank_correct + categoryProgress["fill-in-the-blank"].correct,
      fill_blank_total:
        base.fill_blank_total + categoryProgress["fill-in-the-blank"].total,
      idioms_correct:
        base.idioms_correct + categoryProgress.idioms.correct,
      idioms_total: base.idioms_total + categoryProgress.idioms.total,
      seen_questions: base.seen_questions,
    });

    if (statsError) {
      return { success: false, error: statsError.message };
    }

    if (payload.questionIds.length > 0) {
      await supabase.rpc("update_seen_questions", {
        p_user_id: user.id,
        p_question_ids: payload.questionIds,
      });
    }
  }

  const mistakeResult = await recordMatchMistakes(
    payload.sessionId,
    payload.mistakes
  );

  if (!mistakeResult.success) {
    return mistakeResult;
  }

  await supabase
    .from("game_sessions")
    .update({ status: "completed" })
    .eq("id", payload.sessionId);

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
