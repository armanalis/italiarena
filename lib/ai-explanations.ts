import type { CorrectAnswer } from "@/types/database.types";

export const MAX_AI_ASKS_PER_MATCH = 3;

export const GROQ_EXPLANATION_MODEL = "llama-3.1-8b-instant";

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
