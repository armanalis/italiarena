import { cache } from "react";
import { getPrivilegedSupabase } from "@/lib/supabase-admin";

export type AdminQueueCounts = {
  /** Distinct questions with open reports (pending + quarantined). */
  reported: number;
  /** Community submissions still waiting for approval. */
  submissions: number;
  /** Everything that needs an admin's attention. */
  total: number;
};

const EMPTY_COUNTS: AdminQueueCounts = {
  reported: 0,
  submissions: 0,
  total: 0,
};

/**
 * Lightweight badge counts for the admin review queue.
 *
 * Only ids are fetched (never full question rows) so this stays cheap enough to
 * run on every page render for admins. Callers must verify the admin role
 * themselves — this helper does no authorization on its own.
 */
export const getAdminQueueCounts = cache(
  async (): Promise<AdminQueueCounts> => {
    try {
      const supabase = await getPrivilegedSupabase();

      const [reports, flagged, submissions] = await Promise.all([
        supabase
          .from("reports")
          .select("question_id")
          .returns<{ question_id: string }[]>(),
        supabase
          .from("questions_flagged")
          .select("id")
          .returns<{ id: string }[]>(),
        supabase
          .from("question_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      if (reports.error || flagged.error || submissions.error) {
        return EMPTY_COUNTS;
      }

      // A question can be both reported and quarantined — count it once.
      const reportedIds = new Set<string>();
      for (const row of reports.data ?? []) {
        reportedIds.add(row.question_id);
      }
      for (const row of flagged.data ?? []) {
        reportedIds.add(row.id);
      }

      const reported = reportedIds.size;
      const pendingSubmissions = submissions.count ?? 0;

      return {
        reported,
        submissions: pendingSubmissions,
        total: reported + pendingSubmissions,
      };
    } catch {
      // Badge counts are decorative — never break the page over them.
      return EMPTY_COUNTS;
    }
  }
);
