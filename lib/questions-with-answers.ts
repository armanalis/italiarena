import { createAdminClientOrNull } from "@/utils/supabase/admin";
import type { QuestionActive } from "@/types/database.types";

/**
 * Server-only: questions INCLUDING correct_answer, read with the service role
 * (players can no longer select that column). Only call this for questions
 * the player has already answered — their mistakes or finished matches.
 */
export async function resolveQuestionsWithAnswers(
  ids: string[]
): Promise<Map<string, QuestionActive>> {
  const byId = new Map<string, QuestionActive>();
  const admin = createAdminClientOrNull();
  if (!admin || ids.length === 0) {
    return byId;
  }

  const uniqueIds = [...new Set(ids)];
  const [{ data: active }, { data: flagged }] = await Promise.all([
    admin.from("questions_active").select("*").in("id", uniqueIds),
    admin.from("questions_flagged").select("*").in("id", uniqueIds),
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
