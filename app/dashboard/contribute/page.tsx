/** Community question submission — reviewed before entering the live pool. */
import Link from "next/link";
import { PenLine } from "lucide-react";
import { QuestionSubmissionForm } from "@/components/contribute/question-submission-form";
import { Button } from "@/components/ui/button";
import { isGuestUser, requireOnboardingComplete } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function ContributePage() {
  const profile = await requireOnboardingComplete();

  if (isGuestUser(profile)) {
    redirect("/dashboard");
  }
  const supabase = await createClient();

  const { count: pendingCount } = await supabase
    .from("question_submissions")
    .select("id", { count: "exact", head: true })
    .eq("submitter_id", profile.id)
    .eq("status", "pending");

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col">
      <header className="w-full border-b border-border/60 px-4 py-5 sm:px-8 sm:py-6 lg:px-10 xl:px-12">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-2">
              <PenLine className="size-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Contribute a question
              </h1>
              <p className="text-sm text-muted-foreground">
                Help grow the Italian pool. Every submission is reviewed for level
                and category accuracy before it goes live.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto">
            <Link href="/dashboard">Back to Play</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl p-4 sm:p-8">
        <QuestionSubmissionForm pendingCount={pendingCount ?? 0} />
      </div>
    </main>
  );
}
