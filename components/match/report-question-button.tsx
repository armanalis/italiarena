"use client";

import { useState, useTransition } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reportQuestion } from "@/app/dashboard/match/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReportIssueType } from "@/types/database.types";
import { cn } from "@/lib/utils";

const ISSUE_OPTIONS: { value: ReportIssueType; label: string }[] = [
  { value: "typo", label: "Typo" },
  { value: "wrong_answer", label: "Wrong correct answer" },
  { value: "unnatural_phrasing", label: "Unnatural phrasing" },
];

type ReportQuestionButtonProps = {
  questionId: string;
  questionText: string;
  className?: string;
};

export function ReportQuestionButton({
  questionId,
  questionText,
  className,
}: ReportQuestionButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<ReportIssueType | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selectedIssue) {
      toast.error("Select an issue type before submitting.");
      return;
    }

    startTransition(async () => {
      const result = await reportQuestion(questionId, selectedIssue);

      if (result.success) {
        toast.success("Report logged. Thanks for the feedback!");
        setOpen(false);
        setSelectedIssue(null);
        return;
      }

      toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-11 shrink-0 text-muted-foreground hover:text-amber-400",
            className
          )}
          aria-label="Report question"
        >
          <Flag className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this question</DialogTitle>
          <DialogDescription>
            Help us improve the question pool. You can only report each question
            once.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm leading-relaxed">
          {questionText}
        </p>

        <div className="grid gap-2">
          {ISSUE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={isPending}
              onClick={() => setSelectedIssue(option.value)}
              className={cn(
                "min-h-11 rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                "border-border/60 hover:border-amber-500/40 hover:bg-amber-500/5",
                selectedIssue === option.value &&
                  "border-amber-500 bg-amber-500/10 text-amber-100"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !selectedIssue}
            onClick={handleSubmit}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit report"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
