"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile, isGuestUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import {
  MAX_PENDING_SUBMISSIONS,
  MAX_SUBMISSIONS_PER_DAY,
  validateQuestionSubmission,
  type QuestionSubmissionInput,
} from "@/lib/question-contribution";
import { runSubmissionAiPrecheck } from "@/lib/run-submission-precheck";

export type SubmitQuestionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitQuestion(
  input: QuestionSubmissionInput
): Promise<SubmitQuestionResult> {
  const validated = validateQuestionSubmission(input);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated." };
  }

  if (isGuestUser(profile)) {
    return {
      success: false,
      error: "Guest players cannot contribute questions. Sign up to submit.",
    };
  }

  const supabase = await createClient();

  const { count: pendingCount, error: pendingError } = await supabase
    .from("question_submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitter_id", profile.id)
    .eq("status", "pending");

  if (pendingError) {
    return { success: false, error: pendingError.message };
  }

  if ((pendingCount ?? 0) >= MAX_PENDING_SUBMISSIONS) {
    return {
      success: false,
      error: `You already have ${MAX_PENDING_SUBMISSIONS} questions waiting for review. Wait for admin feedback before submitting more.`,
    };
  }

  // Rolling 24 hours: the server clock is UTC, so "since midnight" reset at
  // 1-2 am in Italy.
  const dayStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { count: todayCount, error: todayError } = await supabase
    .from("question_submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitter_id", profile.id)
    .gte("created_at", dayStart.toISOString());

  if (todayError) {
    return { success: false, error: todayError.message };
  }

  if ((todayCount ?? 0) >= MAX_SUBMISSIONS_PER_DAY) {
    return {
      success: false,
      error: `You can submit up to ${MAX_SUBMISSIONS_PER_DAY} questions per 24 hours. Try again later.`,
    };
  }

  // ilike reads % and _ as wildcards, and fill-in-the-blank text is full of
  // "___"; escape them so only the same text counts as a duplicate.
  const questionTextPattern = validated.data.question_text.replace(/[\\%_]/g, "\\$&");

  const { data: duplicateActive } = await supabase
    .from("questions_active")
    .select("id")
    .ilike("question_text", questionTextPattern)
    .limit(1);

  if (duplicateActive?.length) {
    return {
      success: false,
      error: "This question already exists in the live pool.",
    };
  }

  const { data: duplicatePending } = await supabase
    .from("question_submissions")
    .select("id")
    .eq("submitter_id", profile.id)
    .eq("status", "pending")
    .ilike("question_text", questionTextPattern)
    .limit(1);

  if (duplicatePending?.length) {
    return {
      success: false,
      error: "You already submitted this question and it is still pending review.",
    };
  }

  const { data: inserted, error } = await supabase
    .from("question_submissions")
    .insert({
      submitter_id: profile.id,
      language: validated.data.language,
      level: validated.data.level,
      category: validated.data.category,
      question_text: validated.data.question_text,
      option_a: validated.data.option_a,
      option_b: validated.data.option_b,
      option_c: validated.data.option_c,
      option_d: validated.data.option_d,
      correct_answer: validated.data.correct_answer,
      rationale: validated.data.rationale,
      status: "pending",
      ai_precheck_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "You already submitted a pending question with the same text.",
      };
    }

    return { success: false, error: error.message };
  }

  try {
    await runSubmissionAiPrecheck(inserted.id, validated.data);
  } catch {
    // Submission is saved; admin can review even if AI pre-check fails.
  }

  revalidatePath("/dashboard/contribute");
  revalidatePath("/admin");

  return { success: true };
}
