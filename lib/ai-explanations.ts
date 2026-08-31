import type { CorrectAnswer } from "@/types/database.types";

export const MAX_AI_ASKS_PER_MATCH = 3;

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
