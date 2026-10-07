"use server";

import { isReportIssueType } from "@/lib/report-issues";
import { createClient } from "@/utils/supabase/server";
import type { ReportIssueType } from "@/types/database.types";

export type ReportQuestionResult =
  | { success: true }
  | { success: false; error: string };

/** Server-side report path (e.g. non-client callers). Match UI uses `submitQuestionReport`. */
export async function reportQuestion(
  questionId: string,
  issueType: ReportIssueType
): Promise<ReportQuestionResult> {
  if (!isReportIssueType(issueType)) {
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
