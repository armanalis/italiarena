"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  approveQuestionSubmission,
  rejectQuestionSubmission,
  type AdminSubmissionReview,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SubmissionAiPrecheckPanel } from "@/components/admin/submission-ai-precheck-panel";
import { formatCategoryLabel } from "@/lib/scoring";

type QuestionSubmissionsTableProps = {
  submissions: AdminSubmissionReview[];
};

export function QuestionSubmissionsTable({
  submissions,
}: QuestionSubmissionsTableProps) {
  const [rejecting, setRejecting] = useState<AdminSubmissionReview | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
        No community submissions waiting for review.
      </div>
    );
  }

  function handleApprove(submission: AdminSubmissionReview) {
    startTransition(async () => {
      const result = await approveQuestionSubmission(submission.id);

      if (result.success) {
        toast.success("Question approved and added to the live pool.");
        return;
      }

      toast.error(result.error);
    });
  }

  function handleReject() {
    if (!rejecting) {
      return;
    }

    startTransition(async () => {
      const result = await rejectQuestionSubmission(rejecting.id, rejectNotes);

      if (result.success) {
        toast.success("Submission rejected.");
        setRejecting(null);
        setRejectNotes("");
        return;
      }

      toast.error(result.error);
    });
  }

  return (
    <>
      <div className="space-y-4">
        {submissions.map((submission) => (
          <article
            key={submission.id}
            className="rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{submission.level}</Badge>
                  <Badge variant="outline">
                    {formatCategoryLabel(submission.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    by {submission.submitter_label}
                  </span>
                </div>
                <p className="text-base font-medium leading-relaxed">
                  {submission.question_text}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(["A", "B", "C", "D"] as const).map((letter) => {
                const option =
                  letter === "A"
                    ? submission.option_a
                    : letter === "B"
                      ? submission.option_b
                      : letter === "C"
                        ? submission.option_c
                        : submission.option_d;
                const isCorrect = submission.correct_answer === letter;

                return (
                  <div
                    key={letter}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isCorrect
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-border/60"
                    }`}
                  >
                    <span className="font-semibold text-indigo-400">{letter}.</span>{" "}
                    {option}
                  </div>
                );
              })}
            </div>

            {submission.rationale && (
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">Contributor rationale</p>
                <p className="mt-1 text-muted-foreground">{submission.rationale}</p>
              </div>
            )}

            <SubmissionAiPrecheckPanel submission={submission} />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isPending}
                onClick={() => handleApprove(submission)}
                className="min-h-10"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setRejecting(submission);
                  setRejectNotes("");
                }}
                className="min-h-10"
              >
                <X className="size-4" />
                Reject
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) {
            setRejecting(null);
            setRejectNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>
              Explain what is wrong — especially level or category mismatch — so
              contributors learn the standard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-notes">Reviewer notes</Label>
            <textarea
              id="reject-notes"
              value={rejectNotes}
              onChange={(event) => setRejectNotes(event.target.value)}
              rows={4}
              placeholder="Example: This is A2 vocabulary, not B2. The subjunctive trigger makes it too advanced for the selected level."
              className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:text-sm"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setRejecting(null);
                setRejectNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || rejectNotes.trim().length < 8}
              onClick={handleReject}
            >
              Reject submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
