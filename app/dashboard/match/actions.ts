"use server";

import { createClient } from "@/utils/supabase/server";
import type { ReportIssueType } from "@/types/database.types";

export type ReportQuestionResult =
  | { success: true }
  | { success: false; error: string };

const ISSUE_TYPES: ReportIssueType[] = [
  "typo",
  "wrong_answer",
  "unnatural_phrasing",
];

export async function reportQuestion(
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
