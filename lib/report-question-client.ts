import { createClient } from "@/utils/supabase/client";
import type { ReportIssueType } from "@/types/database.types";

export type ReportQuestionResult =
  | { success: true }
  | { success: false; error: string };

const ISSUE_TYPES: ReportIssueType[] = [
  "typo",
  "wrong_answer",
  "unnatural_phrasing",
];

/**
 * Submit a question report from the browser. Uses the Supabase client directly
 * so the request is not queued behind match-sync server actions during a live
 * round (which previously left the second player stuck on "Submitting...").
 */
export async function submitQuestionReport(
  questionId: string,
  issueType: ReportIssueType
): Promise<ReportQuestionResult> {
  if (!ISSUE_TYPES.includes(issueType)) {
    return { success: false, error: "Invalid issue type." };
  }

  const supabase = createClient();
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
