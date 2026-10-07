"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAiExplanationCacheKey,
  MAX_AI_ASKS_PER_MATCH,
  MAX_NEW_AI_ASKS_PER_DAY,
  type AskAiExplanationPayload,
} from "@/lib/ai-explanations";
import { generateGroqExplanation } from "@/lib/groq";
import { isMatchScoreState } from "@/lib/match-score-state";
import { extractQuestionIds } from "@/lib/session-playlist";
import { createAdminClientOrNull } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import type { CorrectAnswer } from "@/types/database.types";

export type AskAiExplanationResult =
  | {
      success: true;
      explanation: string;
      fromCache: boolean;
      asksRemaining: number;
    }
  | {
      success: false;
      error: string;
      asksRemaining: number;
    };

type ExplainableQuestion = {
  id: string;
  category: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
};

const ANSWER_LETTERS: readonly CorrectAnswer[] = ["A", "B", "C", "D"];

function isAnswerLetter(value: unknown): value is CorrectAnswer {
  return ANSWER_LETTERS.includes(value as CorrectAnswer);
}

function optionText(question: ExplainableQuestion, letter: CorrectAnswer) {
  const options: Record<CorrectAnswer, string> = {
    A: question.option_a,
    B: question.option_b,
    C: question.option_c,
    D: question.option_d,
  };
  return options[letter];
}

async function countMatchAiAsks(
  userId: string,
  sessionId: string
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("match_ai_asks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("session_id", sessionId);

  if (error) {
    return MAX_AI_ASKS_PER_MATCH;
  }

  return count ?? 0;
}

async function countAiAsksLastDay(userId: string): Promise<number> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("match_ai_asks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    return MAX_NEW_AI_ASKS_PER_DAY;
  }

  return count ?? 0;
}

/**
 * Reads the question from the database with the service-role client;
 * quarantined questions live in questions_flagged.
 */
async function loadExplainableQuestion(
  supabase: SupabaseClient,
  questionId: string
): Promise<ExplainableQuestion | null> {
  const columns =
    "id, category, question_text, option_a, option_b, option_c, option_d, correct_answer";

  for (const table of ["questions_active", "questions_flagged"]) {
    const { data } = await supabase
      .from(table)
      .select(columns)
      .eq("id", questionId)
      .maybeSingle()
      .returns<ExplainableQuestion>();

    if (data) {
      return data;
    }
  }

  return null;
}

/**
 * An explanation states the correct answer, so it is only given for a
 * question the player has already answered: one in their mistakes list, or
 * one from their own match that is finished or has already scored it.
 */
async function canExplainQuestion(
  admin: SupabaseClient,
  userId: string,
  sessionId: string,
  questionId: string
): Promise<boolean> {
  const { data: mistake } = await admin
    .from("user_mistakes")
    .select("id")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (mistake) {
    return true;
  }

  // Practice sessions use a browser-made id; a non-uuid simply finds nothing.
  const { data: session } = await admin
    .from("game_sessions")
    .select("player_a_id, player_b_id, status, question_playlist, score_state")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || (session.player_a_id !== userId && session.player_b_id !== userId)) {
    return false;
  }

  if (!extractQuestionIds(session.question_playlist).includes(questionId)) {
    return false;
  }

  if (session.status !== "waiting" && session.status !== "active") {
    return true;
  }

  const score = isMatchScoreState(session.score_state) ? session.score_state : null;
  return Boolean(score?.roundReviews.some((round) => round.questionId === questionId));
}

/**
 * Only the ids and the chosen letter come from the browser. The question text
 * and correct answer are read from the database, and the explanation is stored
 * with the service role, so a player cannot plant text in the shared cache.
 */
export async function askQuestionExplanation(
  payload: AskAiExplanationPayload
): Promise<AskAiExplanationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in.",
      asksRemaining: 0,
    };
  }

  const selectedAnswer = isAnswerLetter(payload.selectedAnswer)
    ? payload.selectedAnswer
    : null;

  if (!payload.sessionId || !payload.questionId) {
    return {
      success: false,
      error: "Missing question context.",
      asksRemaining: MAX_AI_ASKS_PER_MATCH,
    };
  }

  const admin = createAdminClientOrNull();
  if (!admin) {
    return {
      success: false,
      error: "AI explanations are not configured yet.",
      asksRemaining: 0,
    };
  }

  if (!(await canExplainQuestion(admin, user.id, payload.sessionId, payload.questionId))) {
    return {
      success: false,
      error: "AI explanations open once you have answered this question.",
      asksRemaining: 0,
    };
  }

  const cacheKey = buildAiExplanationCacheKey(payload.questionId, selectedAnswer);

  const asksUsed = await countMatchAiAsks(user.id, payload.sessionId);
  const asksRemaining = Math.max(0, MAX_AI_ASKS_PER_MATCH - asksUsed);

  // Service role: players cannot read the shared cache directly (each entry
  // states an answer) — see answer-secrecy-2-lockdown-2026-10.sql.
  const { data: cached, error: cacheReadError } = await admin
    .from("question_ai_explanations")
    .select("explanation")
    .eq("cache_key", cacheKey)
    .maybeSingle()
    .returns<{ explanation: string }>();

  if (cacheReadError) {
    return { success: false, error: cacheReadError.message, asksRemaining };
  }

  if (cached?.explanation) {
    return {
      success: true,
      explanation: cached.explanation,
      fromCache: true,
      asksRemaining,
    };
  }

  if (asksUsed >= MAX_AI_ASKS_PER_MATCH) {
    return {
      success: false,
      error: `You have used all ${MAX_AI_ASKS_PER_MATCH} AI explanations for this session.`,
      asksRemaining: 0,
    };
  }

  if ((await countAiAsksLastDay(user.id)) >= MAX_NEW_AI_ASKS_PER_DAY) {
    return {
      success: false,
      error: `You have reached today's limit of ${MAX_NEW_AI_ASKS_PER_DAY} new AI explanations. Try again tomorrow.`,
      asksRemaining,
    };
  }

  // Service role: players will lose read access to correct_answer (and never
  // see questions_flagged), but the explanation still needs both.
  const question = await loadExplainableQuestion(admin, payload.questionId);
  if (!question) {
    return {
      success: false,
      error: "This question is no longer available.",
      asksRemaining,
    };
  }

  const generated = await generateGroqExplanation({
    sessionId: payload.sessionId,
    questionId: question.id,
    category: question.category,
    questionText: question.question_text,
    correctAnswer: question.correct_answer,
    correctOptionText: optionText(question, question.correct_answer),
    selectedAnswer,
    selectedOptionText: selectedAnswer ? optionText(question, selectedAnswer) : null,
    wasCorrect: selectedAnswer === question.correct_answer,
  });

  if ("error" in generated) {
    return { success: false, error: generated.error, asksRemaining };
  }

  // Service-role only RPC: re-checks the per-session limit, derives the cache
  // key itself, and never overwrites an existing explanation — see
  // supabase/security-hardening-2026-10.sql.
  const { error: recordError } = await admin.rpc("record_ai_explanation_for_user", {
    p_user_id: user.id,
    p_session_id: payload.sessionId,
    p_question_id: question.id,
    p_selected_answer: selectedAnswer,
    p_explanation: generated.explanation,
  });

  if (recordError) {
    if (recordError.message.includes("AI_ASK_LIMIT_REACHED")) {
      return {
        success: false,
        error: `You have used all ${MAX_AI_ASKS_PER_MATCH} AI explanations for this session.`,
        asksRemaining: 0,
      };
    }
    return { success: false, error: recordError.message, asksRemaining };
  }

  return {
    success: true,
    explanation: generated.explanation,
    fromCache: false,
    asksRemaining: Math.max(0, asksRemaining - 1),
  };
}
