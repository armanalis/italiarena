import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CorrectAnswer,
  QuestionActive,
  QuestionCategory,
} from "@/types/database.types";

/** Load questions by id from the active pool and the flagged (quarantined) pool. */
export async function resolveQuestionsByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, QuestionActive>> {
  if (ids.length === 0) {
    return new Map();
  }

  const uniqueIds = [...new Set(ids)];
  const byId = new Map<string, QuestionActive>();

  const [{ data: active }, { data: flagged }] = await Promise.all([
    supabase.from("questions_active").select("*").in("id", uniqueIds),
    supabase.from("questions_flagged").select("*").in("id", uniqueIds),
  ]);

  for (const question of active ?? []) {
    byId.set(question.id, question as QuestionActive);
  }

  for (const question of flagged ?? []) {
    if (!byId.has(question.id)) {
      const { report_count: _reportCount, ...rest } = question;
      byId.set(question.id, rest as QuestionActive);
    }
  }

  return byId;
}

export function getOptionText(
  question: QuestionActive,
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
