"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type ResetStatsResult =
  | { success: true }
  | { success: false; error: string };

export async function resetPlayerStatistics(): Promise<ResetStatsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { error: statsError } = await supabase.from("player_stats").upsert({
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
  });

  if (statsError) {
    return { success: false, error: statsError.message };
  }

  const { error: historyError } = await supabase
    .from("match_history")
    .delete()
    .eq("user_id", user.id);

  if (historyError) {
    return { success: false, error: historyError.message };
  }

  revalidatePath("/dashboard/statistics");
  revalidatePath("/dashboard/settings");
  return { success: true };
}
