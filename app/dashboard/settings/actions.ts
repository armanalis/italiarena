"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  PROFICIENCY_LEVELS,
  TARGET_LANGUAGES,
  type ProficiencyLevel,
  type TargetLanguage,
} from "@/lib/constants";
import type { CategoryProgress, MatchHistoryEntry } from "@/lib/types";
import type { MatchResult, OpponentType, PlayerStats } from "@/types/database.types";

export type SettingsActionResult =
  | { success: true }
  | { success: false; error: string };

function isTargetLanguage(value: string): value is TargetLanguage {
  return TARGET_LANGUAGES.includes(value as TargetLanguage);
}

function isProficiencyLevel(value: string): value is ProficiencyLevel {
  return PROFICIENCY_LEVELS.includes(value as ProficiencyLevel);
}

export async function getSettingsData() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, email, display_name, target_language, proficiency_level, role, sound_enabled, haptics_enabled"
    )
    .eq("id", user.id)
    .single();

  const { data: recentMatches } = await supabase
    .from("match_history")
    .select("*")
    .eq("user_id", user.id)
    .order("played_at", { ascending: false })
    .limit(10);

  return {
    profile: {
      id: user.id,
      email: profile?.email ?? user.email ?? "",
      display_name: profile?.display_name ?? null,
      target_language: (profile?.target_language as TargetLanguage | null) ?? null,
      proficiency_level:
        (profile?.proficiency_level as ProficiencyLevel | null) ?? null,
      role: (profile?.role as "user" | "admin" | undefined) ?? "user",
      sound_enabled: profile?.sound_enabled ?? true,
      haptics_enabled: profile?.haptics_enabled ?? true,
    },
    recentMatches: (recentMatches ?? []) as MatchHistoryEntry[],
  };
}

export async function updateLearningProfile(formData: FormData): Promise<SettingsActionResult> {
  const targetLanguage = String(formData.get("target_language") ?? "");
  const proficiencyLevel = String(formData.get("proficiency_level") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!isTargetLanguage(targetLanguage) || !isProficiencyLevel(proficiencyLevel)) {
    return { success: false, error: "Choose a valid language and level." };
  }

  if (displayName && (displayName.length < 2 || displayName.length > 24)) {
    return { success: false, error: "Display name must be 2–24 characters." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error } = await supabase
    .from("users")
    .update({
      target_language: targetLanguage,
      proficiency_level: proficiencyLevel,
      display_name: displayName || null,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateGameplayPreferences(
  soundEnabled: boolean,
  hapticsEnabled: boolean
): Promise<SettingsActionResult> {
  const supabase = createClient();
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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { success: false, error: "Not authenticated." };
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

  const supabase = createClient();
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
  redirect("/login");
}

export async function getPlayerStatistics(): Promise<PlayerStats | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("player_stats")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return data as PlayerStats | null;
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
}): Promise<SettingsActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: existing } = await supabase
    .from("match_history")
    .select("id")
    .eq("user_id", user.id)
    .eq("session_id", payload.sessionId)
    .maybeSingle();

  if (existing) {
    return { success: true };
  }

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
      base.grammar_correct + payload.categoryProgress.grammar.correct,
    grammar_total: base.grammar_total + payload.categoryProgress.grammar.total,
    vocab_correct:
      base.vocab_correct + payload.categoryProgress.vocabulary.correct,
    vocab_total: base.vocab_total + payload.categoryProgress.vocabulary.total,
    fill_blank_correct:
      base.fill_blank_correct + payload.categoryProgress["fill-in-the-blank"].correct,
    fill_blank_total:
      base.fill_blank_total + payload.categoryProgress["fill-in-the-blank"].total,
    idioms_correct:
      base.idioms_correct + payload.categoryProgress.idioms.correct,
    idioms_total: base.idioms_total + payload.categoryProgress.idioms.total,
    seen_questions: base.seen_questions,
  });

  if (statsError) {
    return { success: false, error: statsError.message };
  }

  await supabase
    .from("game_sessions")
    .update({ status: "completed" })
    .eq("id", payload.sessionId);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/statistics");
  return { success: true };
}
