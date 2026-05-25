/** Admin review queue for quarantined questions. */
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getFlaggedQuestions } from "@/app/admin/actions";
import { FlaggedQuestionsTable } from "@/components/admin/flagged-questions-table";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  await requireAdmin();
  const flaggedQuestions = await getFlaggedQuestions();

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-background">
      <header className="border-b border-border/60 px-4 py-5 sm:px-8 sm:py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2">
              <ShieldAlert className="size-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Review flagged questions and restore or remove them from the pool.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-4 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
          <div>
            <h2 className="text-lg font-semibold">Flagged questions</h2>
            <p className="text-sm text-muted-foreground">
              {flaggedQuestions.length} question
              {flaggedQuestions.length === 1 ? "" : "s"} awaiting review
            </p>
          </div>
        </div>

        <FlaggedQuestionsTable questions={flaggedQuestions} />
      </div>
    </main>
  );
}
