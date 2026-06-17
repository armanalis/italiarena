"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId } from "@/lib/auth";
import { resolveQuestionsByIds } from "@/lib/resolve-match-questions";
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

async function resolveQuestionById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionId: string
): Promise<QuestionActive | null> {
  const questions = await resolveQuestionsByIds(supabase, [questionId]);
  return questions.get(questionId) ?? null;
}

export async function getUserMistakes(): Promise<UserMistakeWithQuestion[]> {
  const userId = await getAuthUserId();

  if (!userId) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_mistakes")
    .select("id, question_id, selected_answer, practice_streak, last_mistaken_at")
    .eq("user_id", userId)
    .order("last_mistaken_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  const questionsById = await resolveQuestionsByIds(
    supabase,
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

  for (const mistake of mistakes) {
    const { data: existing } = await supabase
      .from("user_mistakes")
      .select("id")
      .eq("user_id", user.id)
      .eq("question_id", mistake.questionId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("user_mistakes")
        .update({
          selected_answer: mistake.selectedAnswer,
          practice_streak: 0,
          last_mistaken_at: new Date().toISOString(),
          session_id: sessionId,
        })
        .eq("id", existing.id);

      if (error) {
        return { success: false, error: error.message };
      }
      continue;
    }

    const { error } = await supabase.from("user_mistakes").insert({
      user_id: user.id,
      question_id: mistake.questionId,
      selected_answer: mistake.selectedAnswer,
      practice_streak: 0,
      session_id: sessionId,
    });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/dashboard/statistics");
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

  const question = await resolveQuestionById(supabase, questionId);

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

  const { error: statsError } = await supabase.from("player_stats").upsert({
    user_id: user.id,
    matches_played: 0,
    matches_won: 0,
    matches_lost: 0,
    grammar_correct: 0,
    grammar_total: 0,
    vocab_correct: 0,
    vocab_total: 0,
    fill_blank_correct: 0,
    fill_blank_total: 0,
    idioms_correct: 0,
    idioms_total: 0,
    seen_questions: [],
  });

  if (statsError) {
    return { success: false, error: statsError.message };
  }

  const { error: historyError } = await supabase
    .from("match_history")
    .delete()
    .eq("user_id", user.id);

  if (historyError) {
    return { success: false, error: historyError.message };
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
  return { success: true };
}
