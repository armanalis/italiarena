"use server";

import {
  buildAiExplanationCacheKey,
  MAX_AI_ASKS_PER_MATCH,
  type AskAiExplanationPayload,
} from "@/lib/ai-explanations";
import { generateGroqExplanation } from "@/lib/groq";
import { createClient } from "@/utils/supabase/server";

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

  if (!payload.sessionId || !payload.questionId || !payload.questionText.trim()) {
    return {
      success: false,
      error: "Missing question context.",
      asksRemaining: MAX_AI_ASKS_PER_MATCH,
    };
  }

  const cacheKey = buildAiExplanationCacheKey(
    payload.questionId,
    payload.selectedAnswer
  );

  const asksUsed = await countMatchAiAsks(user.id, payload.sessionId);
  const asksRemaining = Math.max(0, MAX_AI_ASKS_PER_MATCH - asksUsed);

  const { data: cached, error: cacheReadError } = await supabase
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
      error: `You have used all ${MAX_AI_ASKS_PER_MATCH} AI explanations for this match.`,
      asksRemaining: 0,
    };
  }

  const generated = await generateGroqExplanation(payload);

  if ("error" in generated) {
    return { success: false, error: generated.error, asksRemaining };
  }

  const { error: cacheWriteError } = await supabase
    .from("question_ai_explanations")
    .upsert({
      cache_key: cacheKey,
      question_id: payload.questionId,
      selected_answer: payload.selectedAnswer,
      explanation: generated.explanation,
    });

  if (cacheWriteError) {
    return { success: false, error: cacheWriteError.message, asksRemaining };
  }

  const { error: usageError } = await supabase.from("match_ai_asks").insert({
    user_id: user.id,
    session_id: payload.sessionId,
    question_id: payload.questionId,
    cache_key: cacheKey,
  });

  if (usageError) {
    return { success: false, error: usageError.message, asksRemaining };
  }

  return {
    success: true,
    explanation: generated.explanation,
    fromCache: false,
    asksRemaining: Math.max(0, asksRemaining - 1),
  };
}
