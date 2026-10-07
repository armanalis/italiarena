"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { cachedDashboardQuery, dashboardTag, revalidateUserDashboard } from "@/lib/dashboard-cache";
import { resolveQuestionsWithAnswers } from "@/lib/questions-with-answers";
import { isAnswerCorrect } from "@/lib/scoring";
import { createClient } from "@/utils/supabase/server";
import type {
  CorrectAnswer,
  QuestionActive,
} from "@/types/database.types";

export type ResetStatsResult =
  | { success: true }
  | { success: false; error: string };

export type MistakeActionResult =
  | { success: true }
  | { success: false; error: string };

export type PracticeAnswerResult =
  | {
      success: true;
      correct: boolean;
      practiceStreak: number;
      mastered: boolean;
    }
  | { success: false; error: string };

export type UserMistakeWithQuestion = {
  id: string;
  question_id: string;
  selected_answer: CorrectAnswer | null;
  practice_streak: number;
  last_mistaken_at: string;
  question: QuestionActive;
};

type MatchMistakeInput = {
  questionId: string;
  selectedAnswer: CorrectAnswer | null;
};

const PRACTICE_MASTER_STREAK = 3;

/** Only for questions already in the player's own mistakes list. */
async function resolveQuestionById(
  questionId: string
): Promise<QuestionActive | null> {
  const questions = await resolveQuestionsWithAnswers([questionId]);
  return questions.get(questionId) ?? null;
}

export async function getUserMistakes(): Promise<UserMistakeWithQuestion[]> {
  const userId = await getAuthUserId();

  if (!userId) {
    return [];
  }

  return cachedDashboardQuery(
    ["user-mistakes", userId],
    dashboardTag(userId, "statistics"),
    () => fetchUserMistakes(userId)
  );
}

export async function getReportedQuestionIds(): Promise<string[]> {
  const userId = await getAuthUserId();

  if (!userId) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("question_id")
    .eq("reporter_id", userId);

  return [
    ...new Set(
      (data ?? []).map((row) => row.question_id).filter(Boolean) as string[]
    ),
  ];
}

async function fetchUserMistakes(userId: string): Promise<UserMistakeWithQuestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_mistakes")
    .select("id, question_id, selected_answer, practice_streak, last_mistaken_at")
    .eq("user_id", userId)
    .order("last_mistaken_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const questionsById = await resolveQuestionsWithAnswers(
    data.map((row) => row.question_id)
  );

  const results: UserMistakeWithQuestion[] = [];

  for (const row of data) {
    const question = questionsById.get(row.question_id);
    if (!question) {
      continue;
    }

    results.push({
      id: row.id,
      question_id: row.question_id,
      selected_answer: row.selected_answer as CorrectAnswer | null,
      practice_streak: row.practice_streak,
      last_mistaken_at: row.last_mistaken_at,
      question,
    });
  }

  return results;
}

export async function recordMatchMistakes(
  sessionId: string,
  mistakes: MatchMistakeInput[]
): Promise<MistakeActionResult> {
  if (mistakes.length === 0) {
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  // The database only accepts questions from the caller's own finished match
  // (record_match_mistakes), so this cannot be used to look up answers.
  const { error } = await supabase.rpc("record_match_mistakes", {
    p_session_id: sessionId,
    p_mistakes: mistakes,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/statistics");
  revalidateUserDashboard(user.id);
  return { success: true };
}

export async function submitMistakePracticeAnswer(
  questionId: string,
  answer: CorrectAnswer
): Promise<PracticeAnswerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: mistake, error: mistakeError } = await supabase
    .from("user_mistakes")
    .select("id, practice_streak, question_id")
    .eq("user_id", user.id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (mistakeError || !mistake) {
    return { success: false, error: "Mistake not found." };
  }

  const question = await resolveQuestionById(questionId);

  if (!question) {
    return { success: false, error: "Question not found." };
  }

  const correct = isAnswerCorrect(answer, question.correct_answer);

  if (!correct) {
    const { error } = await supabase
      .from("user_mistakes")
      .update({ practice_streak: 0 })
      .eq("id", mistake.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/statistics");
    revalidateUserDashboard(user.id);
    return {
      success: true,
      correct: false,
      practiceStreak: 0,
      mastered: false,
    };
  }

  const nextStreak = mistake.practice_streak + 1;

  if (nextStreak >= PRACTICE_MASTER_STREAK) {
    const { error } = await supabase
      .from("user_mistakes")
      .delete()
      .eq("id", mistake.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/statistics");
    revalidateUserDashboard(user.id);
    return {
      success: true,
      correct: true,
      practiceStreak: PRACTICE_MASTER_STREAK,
      mastered: true,
    };
  }

  const { error } = await supabase
    .from("user_mistakes")
    .update({ practice_streak: nextStreak })
    .eq("id", mistake.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard/statistics");
  revalidateUserDashboard(user.id);
  return {
    success: true,
    correct: true,
    practiceStreak: nextStreak,
    mastered: false,
  };
}

export async function resetPlayerStatistics(): Promise<ResetStatsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  // player_stats/match_history are no longer directly writable by clients
  // (see supabase/match-result-integrity-migration.sql) — this RPC does the
  // zero-out + history delete server-side instead.
  const { error: resetError } = await supabase.rpc("reset_player_stats");

  if (resetError) {
    return { success: false, error: resetError.message };
  }

  const { error: mistakesError } = await supabase
    .from("user_mistakes")
    .delete()
    .eq("user_id", user.id);

  if (mistakesError) {
    return { success: false, error: mistakesError.message };
  }

  revalidatePath("/dashboard/statistics");
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/recent-matches");
  revalidatePath("/dashboard/leaderboard");
  revalidateUserDashboard(user.id);
  return { success: true };
}
