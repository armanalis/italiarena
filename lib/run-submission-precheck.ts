import { getPrivilegedSupabase } from "@/lib/supabase-admin";
import {
  generateSubmissionAiPrecheck,
  type SubmissionAiPrecheck,
} from "@/lib/submission-ai-precheck";
import type { QuestionSubmissionPayload } from "@/lib/question-contribution";

export async function runSubmissionAiPrecheck(
  submissionId: string,
  payload: QuestionSubmissionPayload
): Promise<void> {
  const supabase = await getPrivilegedSupabase();
  const result = await generateSubmissionAiPrecheck(payload);

  if (result.status === "unavailable") {
    await supabase
      .from("question_submissions")
      .update({
        ai_precheck_status: "unavailable",
        ai_precheck_summary: result.reason,
        ai_precheck_details: null,
        ai_precheck_at: new Date().toISOString(),
      } as never)
      .eq("id", submissionId);

    return;
  }

  const details: SubmissionAiPrecheck = result.precheck;

  await supabase
    .from("question_submissions")
    .update({
      ai_precheck_status: "ready",
      ai_precheck_recommendation: details.recommendation,
      ai_precheck_summary: details.summary,
      ai_precheck_details: details,
      ai_precheck_at: new Date().toISOString(),
    } as never)
    .eq("id", submissionId);
}
