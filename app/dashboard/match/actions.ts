"use server";

import { createClient } from "@/utils/supabase/server";
import type { QuestionActive, ReportIssueType } from "@/types/database.types";

export type ReportQuestionResult =
  | { success: true }
  | { success: false; error: string };

export type FetchTiebreakerResult =
  | { success: true; data: QuestionActive }
  | { success: false; error: string };

const ISSUE_TYPES: ReportIssueType[] = [
  "typo",
  "wrong_answer",
  "unnatural_phrasing",
];

export async function fetchTiebreakerQuestion(
  excludeIds: string[]
): Promise<FetchTiebreakerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("target_language, proficiency_level")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile?.target_language ||
    !profile?.proficiency_level
  ) {
    return { success: false, error: "Complete onboarding before playing." };
  }

  const { data, error } = await supabase.rpc("get_tiebreaker_question", {
    p_language: profile.target_language,
    p_level: profile.proficiency_level,
    p_user_id: user.id,
    p_exclude_ids: excludeIds,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data) {
    return {
      success: false,
      error: "No tiebreaker question available for your Italian level.",
    };
  }

  return { success: true, data: data as QuestionActive };
}

/** Server-side report path (e.g. non-client callers). Match UI uses `submitQuestionReport`. */
export async function reportQuestion(
  questionId: string,
  issueType: ReportIssueType
): Promise<ReportQuestionResult> {
  if (!ISSUE_TYPES.includes(issueType)) {
    return { success: false, error: "Invalid issue type." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("question_id", questionId)
    .eq("reporter_id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "You already reported this question." };
  }

  const { error } = await supabase.from("reports").insert({
    question_id: questionId,
    reporter_id: user.id,
    issue_type: issueType,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "You already reported this question." };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}
