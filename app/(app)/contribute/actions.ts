"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile, isGuestUser } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
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
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { success: false, error: "Not authenticated." };
  }

  // A question is for the language the player is learning now.
  const validated = validateQuestionSubmission(input, profile.target_language ?? DEFAULT_LANGUAGE);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  if (isGuestUser(profile)) {
    return {
      success: false,
      error: "Guest players cannot contribute questions. Sign up to submit.",
    };
  }

  const supabase = await createClient();

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

    // The limits are kept by the question_submissions_limits trigger.
    if (error.message.includes("SUBMISSION_PENDING_LIMIT_REACHED")) {
      return {
        success: false,
        error: `You already have ${MAX_PENDING_SUBMISSIONS} questions waiting for review. Wait for admin feedback before submitting more.`,
      };
    }

    if (error.message.includes("SUBMISSION_DAILY_LIMIT_REACHED")) {
      return {
        success: false,
        error: `You can submit up to ${MAX_SUBMISSIONS_PER_DAY} questions per 24 hours. Try again later.`,
      };
    }

    return { success: false, error: error.message };
  }

  try {
    await runSubmissionAiPrecheck(inserted.id, validated.data);
  } catch {
    // Submission is saved; admin can review even if AI pre-check fails.
  }

  revalidatePath("/contribute");
  revalidatePath("/admin");

  return { success: true };
}
