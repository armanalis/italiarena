import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CorrectAnswer,
  PublicQuestion,
  QuestionCategory,
} from "@/types/database.types";

/**
 * Columns players may read from questions_active / questions_flagged. Every
 * column except correct_answer — see supabase/answer-secrecy-2-lockdown-2026-10.sql.
 */
export const PUBLIC_QUESTION_COLUMNS =
  "id, language, level, category, question_text, option_a, option_b, option_c, option_d, random_float";

/**
 * Load questions by id from the active pool and the flagged (quarantined)
 * pool, without their answers. Safe for any client.
 */
export async function resolveQuestionsByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, PublicQuestion>> {
  if (ids.length === 0) {
    return new Map();
  }

  const uniqueIds = [...new Set(ids)];
  const byId = new Map<string, PublicQuestion>();

  const [{ data: active }, { data: flagged }] = await Promise.all([
    supabase.from("questions_active").select(PUBLIC_QUESTION_COLUMNS).in("id", uniqueIds),
    supabase.from("questions_flagged").select(PUBLIC_QUESTION_COLUMNS).in("id", uniqueIds),
  ]);

  for (const question of (active ?? []) as PublicQuestion[]) {
    byId.set(question.id, question);
  }

  for (const question of (flagged ?? []) as PublicQuestion[]) {
    if (!byId.has(question.id)) {
      byId.set(question.id, question);
    }
  }

  return byId;
}

export function getOptionText(
  question: PublicQuestion,
  answer: CorrectAnswer
): string {
  const key = `option_${answer.toLowerCase()}` as
    | "option_a"
    | "option_b"
    | "option_c"
    | "option_d";
  return question[key];
}

export function normalizeQuestionCategory(value: string): QuestionCategory {
  const categories: QuestionCategory[] = [
    "grammar",
    "vocabulary",
    "fill-in-the-blank",
    "idioms",
  ];
  if (categories.includes(value as QuestionCategory)) {
    return value as QuestionCategory;
  }
  return "grammar";
}
