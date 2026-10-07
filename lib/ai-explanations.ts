import type { CorrectAnswer } from "@/types/database.types";

export const MAX_AI_ASKS_PER_MATCH = 3;

/**
 * Practice sessions get a fresh browser-generated id, so the per-match limit
 * alone does not bound Groq spend. This caps new generations per player per
 * rolling 24 hours; cached explanations stay free.
 */
export const MAX_NEW_AI_ASKS_PER_DAY = 30;

// Groq decommissioned the llama-3.1 chat models. gpt-oss is a reasoning model:
// its hidden reasoning tokens count against max_tokens, so every call site must
// send GROQ_REASONING_EFFORT or long answers get truncated mid-sentence.
export const GROQ_EXPLANATION_MODEL = "openai/gpt-oss-120b";

export const GROQ_REASONING_EFFORT = "low";

export type AskAiExplanationPayload = {
  sessionId: string;
  questionId: string;
  category: string;
  questionText: string;
  correctAnswer: CorrectAnswer;
  correctOptionText: string;
  selectedAnswer: CorrectAnswer | null;
  selectedOptionText: string | null;
  wasCorrect: boolean;
};

export function buildAiExplanationCacheKey(
  questionId: string,
  selectedAnswer: CorrectAnswer | null
): string {
  return `${questionId}:${selectedAnswer ?? "none"}`;
}
