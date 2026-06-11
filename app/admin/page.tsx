/** Admin review queue for quarantined questions. */
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import {
  getAdminReviewQueue,
  getPendingQuestionSubmissions,
} from "@/app/admin/actions";
import { FlaggedQuestionsTable } from "@/components/admin/flagged-questions-table";
import { QuestionSubmissionsTable } from "@/components/admin/question-submissions-table";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  await requireAdmin();
  const [reportedQuestions, pendingSubmissions] = await Promise.all([
    getAdminReviewQueue(),
    getPendingQuestionSubmissions(),
  ]);
  const pendingCount = reportedQuestions.filter(
    (question) => question.status === "pending"
  ).length;
  const quarantinedCount = reportedQuestions.filter(
    (question) => question.status === "quarantined"
  ).length;

  return (
    <main className="min-h-app w-full flex-1 touch-scroll bg-background pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <header className="w-full border-b border-border/60 px-4 py-5 sm:px-8 sm:py-6 lg:px-10 xl:px-12">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
              <ShieldAlert className="size-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Review community submissions and player reports before questions
                enter or return to the live pool.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="w-full space-y-10 p-4 sm:p-8 lg:px-10 xl:px-12">
        <section>
          <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
            <div>
              <h2 className="text-lg font-semibold">Community submissions</h2>
              <p className="text-sm text-muted-foreground">
                {pendingSubmissions.length} question
                {pendingSubmissions.length === 1 ? "" : "s"} waiting for approval
              </p>
            </div>
          </div>

          <QuestionSubmissionsTable submissions={pendingSubmissions} />
        </section>

        <section>
        <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
          <div>
            <h2 className="text-lg font-semibold">Reported questions</h2>
            <p className="text-sm text-muted-foreground">
              {reportedQuestions.length} report
              {reportedQuestions.length === 1 ? "" : "s"} awaiting review
              {reportedQuestions.length > 0 && (
                <>
                  {" "}
                  · {pendingCount} pending · {quarantinedCount} quarantined
                </>
              )}
            </p>
          </div>
        </div>

        <FlaggedQuestionsTable questions={reportedQuestions} />
        </section>
      </div>
    </main>
  );
}
