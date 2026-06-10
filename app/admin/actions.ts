"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import type {
  CorrectAnswer,
  QuestionCategory,
  QuestionFlagged,
  ReportIssueType,
} from "@/types/database.types";

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

export type AdminReviewQuestion = QuestionFlagged & {
  status: "pending" | "quarantined";
  issue_types: ReportIssueType[];
};

export async function getAdminReviewQueue(): Promise<AdminReviewQuestion[]> {
  await requireAdmin();

  const supabase = await createClient();

  const { data: reports, error: reportsError } = await supabase
    .from("reports")
    .select("question_id, issue_type");

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  const reportCountByQuestion = new Map<string, number>();
  const issueTypesByQuestion = new Map<string, ReportIssueType[]>();

  for (const row of reports ?? []) {
    reportCountByQuestion.set(
      row.question_id,
      (reportCountByQuestion.get(row.question_id) ?? 0) + 1
    );

    const issueTypes = issueTypesByQuestion.get(row.question_id) ?? [];
    const issueType = row.issue_type as ReportIssueType;
    if (!issueTypes.includes(issueType)) {
      issueTypes.push(issueType);
    }
    issueTypesByQuestion.set(row.question_id, issueTypes);
  }

  if (reportCountByQuestion.size === 0) {
    return [];
  }

  const { data: flagged, error: flaggedError } = await supabase
    .from("questions_flagged")
    .select("*")
    .order("report_count", { ascending: false });

  if (flaggedError) {
    throw new Error(flaggedError.message);
  }

  const flaggedIds = new Set((flagged ?? []).map((question) => question.id));
  const queue: AdminReviewQuestion[] = [];

  for (const question of flagged ?? []) {
    queue.push({
      ...question,
      category: question.category as QuestionCategory,
      correct_answer: question.correct_answer as CorrectAnswer,
      report_count:
        reportCountByQuestion.get(question.id) ?? question.report_count,
      status: "quarantined",
      issue_types: issueTypesByQuestion.get(question.id) ?? [],
    });
  }

  const pendingIds = [...reportCountByQuestion.keys()].filter(
    (id) => !flaggedIds.has(id)
  );

  if (pendingIds.length > 0) {
    const { data: active, error: activeError } = await supabase
      .from("questions_active")
      .select("*")
      .in("id", pendingIds);

    if (activeError) {
      throw new Error(activeError.message);
    }

    for (const question of active ?? []) {
      queue.push({
        ...question,
        category: question.category as QuestionCategory,
        correct_answer: question.correct_answer as CorrectAnswer,
        report_count: reportCountByQuestion.get(question.id) ?? 0,
        status: "pending",
        issue_types: issueTypesByQuestion.get(question.id) ?? [],
      });
    }
  }

  queue.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "quarantined" ? -1 : 1;
    }
    return b.report_count - a.report_count;
  });

  return queue;
}

/** @deprecated Use getAdminReviewQueue */
export async function getFlaggedQuestions() {
  return getAdminReviewQueue();
}

async function clearQuestionReports(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionId: string
) {
  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("question_id", questionId);

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const };
}

export async function dismissReportedQuestion(
  questionId: string
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: flagged } = await supabase
    .from("questions_flagged")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  if (flagged) {
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

    const { error: deleteFlaggedError } = await supabase
      .from("questions_flagged")
      .delete()
      .eq("id", questionId);

    if (deleteFlaggedError) {
      return { success: false, error: deleteFlaggedError.message };
    }
  } else {
    const { data: active } = await supabase
      .from("questions_active")
      .select("id")
      .eq("id", questionId)
      .maybeSingle();

    if (!active) {
      return { success: false, error: "Reported question not found." };
    }
  }

  const cleared = await clearQuestionReports(supabase, questionId);
  if (!cleared.success) {
    return cleared;
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function approveReportedQuestion(
  questionId: string,
  updates: FlaggedQuestionUpdate
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: flagged } = await supabase
    .from("questions_flagged")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  const { data: active } = await supabase
    .from("questions_active")
    .select("*")
    .eq("id", questionId)
    .maybeSingle();

  const source = flagged ?? active;

  if (!source) {
    return { success: false, error: "Reported question not found." };
  }

  const payload = {
    id: source.id,
    language: source.language,
    level: source.level,
    category: source.category as QuestionCategory,
    question_text: updates.question_text.trim(),
    option_a: updates.option_a.trim(),
    option_b: updates.option_b.trim(),
    option_c: updates.option_c.trim(),
    option_d: updates.option_d.trim(),
    correct_answer: updates.correct_answer,
    random_float: source.random_float,
  };

  if (active) {
    const { error: updateError } = await supabase
      .from("questions_active")
      .update(payload)
      .eq("id", questionId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  } else {
    const { error: insertError } = await supabase
      .from("questions_active")
      .insert(payload);

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  if (flagged) {
    const { error: deleteFlaggedError } = await supabase
      .from("questions_flagged")
      .delete()
      .eq("id", questionId);

    if (deleteFlaggedError) {
      return { success: false, error: deleteFlaggedError.message };
    }
  }

  const cleared = await clearQuestionReports(supabase, questionId);
  if (!cleared.success) {
    return cleared;
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteReportedQuestion(
  questionId: string
): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = await createClient();

  const cleared = await clearQuestionReports(supabase, questionId);
  if (!cleared.success) {
    return cleared;
  }

  await supabase.from("questions_flagged").delete().eq("id", questionId);
  await supabase.from("questions_active").delete().eq("id", questionId);

  revalidatePath("/admin");
  return { success: true };
}

/** @deprecated Use dismissReportedQuestion */
export async function dismissFlaggedQuestion(questionId: string) {
  return dismissReportedQuestion(questionId);
}

/** @deprecated Use approveReportedQuestion */
export async function approveFlaggedQuestion(
  questionId: string,
  updates: FlaggedQuestionUpdate
) {
  return approveReportedQuestion(questionId, updates);
}

/** @deprecated Use deleteReportedQuestion */
export async function deleteFlaggedQuestion(questionId: string) {
  return deleteReportedQuestion(questionId);
}
