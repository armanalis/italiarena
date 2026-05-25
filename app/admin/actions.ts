"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type { CorrectAnswer, QuestionCategory } from "@/types/database.types";

export type AdminActionResult =
  | { success: true }
  | { success: false; error: string };

export type FlaggedQuestionUpdate = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
};

export async function getFlaggedQuestions() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("questions_flagged")
    .select("*")
    .order("report_count", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function dismissFlaggedQuestion(
  questionId: string
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: flagged, error: fetchError } = await supabase
    .from("questions_flagged")
    .select("*")
    .eq("id", questionId)
    .single();

  if (fetchError || !flagged) {
    return { success: false, error: "Flagged question not found." };
  }

  const { error: insertError } = await supabase.from("questions_active").insert({
    id: flagged.id,
    language: flagged.language,
    level: flagged.level,
    category: flagged.category,
    question_text: flagged.question_text,
    option_a: flagged.option_a,
    option_b: flagged.option_b,
    option_c: flagged.option_c,
    option_d: flagged.option_d,
    correct_answer: flagged.correct_answer,
    random_float: flagged.random_float,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  const { error: deleteReportsError } = await supabase
    .from("reports")
    .delete()
    .eq("question_id", questionId);

  if (deleteReportsError) {
    return { success: false, error: deleteReportsError.message };
  }

  const { error: deleteFlaggedError } = await supabase
    .from("questions_flagged")
    .delete()
    .eq("id", questionId);

  if (deleteFlaggedError) {
    return { success: false, error: deleteFlaggedError.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function approveFlaggedQuestion(
  questionId: string,
  updates: FlaggedQuestionUpdate
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: flagged, error: fetchError } = await supabase
    .from("questions_flagged")
    .select("*")
    .eq("id", questionId)
    .single();

  if (fetchError || !flagged) {
    return { success: false, error: "Flagged question not found." };
  }

  const { error: insertError } = await supabase.from("questions_active").insert({
    id: flagged.id,
    language: flagged.language,
    level: flagged.level,
    category: flagged.category as QuestionCategory,
    question_text: updates.question_text.trim(),
    option_a: updates.option_a.trim(),
    option_b: updates.option_b.trim(),
    option_c: updates.option_c.trim(),
    option_d: updates.option_d.trim(),
    correct_answer: updates.correct_answer,
    random_float: flagged.random_float,
  });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  const { error: deleteReportsError } = await supabase
    .from("reports")
    .delete()
    .eq("question_id", questionId);

  if (deleteReportsError) {
    return { success: false, error: deleteReportsError.message };
  }

  const { error: deleteFlaggedError } = await supabase
    .from("questions_flagged")
    .delete()
    .eq("id", questionId);

  if (deleteFlaggedError) {
    return { success: false, error: deleteFlaggedError.message };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteFlaggedQuestion(
  questionId: string
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const { error: deleteReportsError } = await supabase
    .from("reports")
    .delete()
    .eq("question_id", questionId);

  if (deleteReportsError) {
    return { success: false, error: deleteReportsError.message };
  }

  const { error: deleteFlaggedError } = await supabase
    .from("questions_flagged")
    .delete()
    .eq("id", questionId);

  if (deleteFlaggedError) {
    return { success: false, error: deleteFlaggedError.message };
  }

  revalidatePath("/admin");
  return { success: true };
}
