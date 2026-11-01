"use server";

import { revalidatePath } from "next/cache";
import { getAuthUserId, getCurrentUserProfile } from "@/lib/auth";
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { cachedDashboardQuery, dashboardTag, revalidateUserDashboard } from "@/lib/dashboard-cache";
import { NOUN_QUESTION_PREFIX } from "@/lib/articles";
import { nextReview, REVIEWS_TO_LEARN } from "@/lib/review";
import { italyToday } from "@/lib/wordle";
import { resolveNounQuestions, resolveQuestionsWithAnswers } from "@/lib/questions-with-answers";
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
      /** Right reviews so far (REVIEWS_TO_LEARN once learned). */
      practiceStreak: number;
      learned: boolean;
      /** null once learned: the mistake is gone. */
      nextReviewOn: string | null;
    }
  | { success: false; error: string };

export type UserMistakeWithQuestion = {
  id: string;
  question_id: string;
  selected_answer: CorrectAnswer | null;
  /** Right reviews so far: lib/review.ts. */
  practice_streak: number;
  next_review_on: string;
  last_mistaken_at: string;
  question: QuestionActive;
};

type MatchMistakeInput = {
  questionId: string;
  selectedAnswer: CorrectAnswer | null;
};

/** Only for questions already in the player's own mistakes list. */
async function resolveQuestionById(
  questionId: string
): Promise<QuestionActive | null> {
  const questions = await resolveQuestionsWithAnswers([questionId]);
  return questions.get(questionId) ?? null;
}

/** Mistakes in the language being played now (each question has its language). */
export async function getUserMistakes(): Promise<UserMistakeWithQuestion[]> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return [];
  }

  const language = profile.target_language ?? DEFAULT_LANGUAGE;
  return cachedDashboardQuery(
    // v2: rows carry next_review_on; never serve a copy cached before it existed.
    ["user-mistakes-v2", profile.id, language],
    dashboardTag(profile.id, "statistics"),
    () => fetchUserMistakes(profile.id, language)
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

async function fetchUserMistakes(
  userId: string,
  language: string
): Promise<UserMistakeWithQuestion[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_mistakes")
    .select("id, question_id, noun_id, selected_answer, practice_streak, next_review_on, last_mistaken_at")
    .eq("user_id", userId)
    .order("last_mistaken_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  // A mistake is a quiz question or a missed article-game noun.
  const [questionsById, nounsById] = await Promise.all([
    resolveQuestionsWithAnswers(data.flatMap((row) => (row.question_id ? [row.question_id] : []))),
    resolveNounQuestions(data.flatMap((row) => (row.noun_id ? [row.noun_id] : []))),
  ]);

  const results: UserMistakeWithQuestion[] = [];

  for (const row of data) {
    const question = row.noun_id ? nounsById.get(row.noun_id) : questionsById.get(row.question_id);
    if (!question || question.language !== language) {
      continue;
    }

    results.push({
      id: row.id,
      question_id: question.id,
      selected_answer: row.selected_answer as CorrectAnswer | null,
      practice_streak: row.practice_streak,
      next_review_on: row.next_review_on,
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

  revalidatePath("/stats");
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

  const nounId = questionId.startsWith(NOUN_QUESTION_PREFIX)
    ? Number(questionId.slice(NOUN_QUESTION_PREFIX.length))
    : null;
  const mistakes = supabase
    .from("user_mistakes")
    .select("id, practice_streak, next_review_on")
    .eq("user_id", user.id);
  const { data: mistake, error: mistakeError } = await (nounId
    ? mistakes.eq("noun_id", nounId)
    : mistakes.eq("question_id", questionId)
  ).maybeSingle();

  if (mistakeError || !mistake) {
    return { success: false, error: "Mistake not found." };
  }

  const question = nounId
    ? (await resolveNounQuestions([nounId])).get(nounId) ?? null
    : await resolveQuestionById(questionId);

  if (!question) {
    return { success: false, error: "Question not found." };
  }

  const correct = isAnswerCorrect(answer, question.correct_answer);
  const next = nextReview(
    { streak: mistake.practice_streak, dueOn: mistake.next_review_on },
    correct,
    italyToday()
  );
  const { error } = next.learned
    ? await supabase.from("user_mistakes").delete().eq("id", mistake.id)
    : await supabase
        .from("user_mistakes")
        .update({ practice_streak: next.streak, next_review_on: next.dueOn })
        .eq("id", mistake.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/stats");
  revalidateUserDashboard(user.id);
  return next.learned
    ? { success: true, correct, learned: true, practiceStreak: REVIEWS_TO_LEARN, nextReviewOn: null }
    : { success: true, correct, learned: false, practiceStreak: next.streak, nextReviewOn: next.dueOn };
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

  revalidatePath("/stats");
  revalidatePath("/settings");
  revalidatePath("/recent");
  revalidatePath("/leaderboard");
  revalidateUserDashboard(user.id);
  return { success: true };
}
