"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserMistakeWithQuestion } from "@/app/dashboard/statistics/actions";
import { formatCategoryLabel, getOptionText } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type MistakesListDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mistakes: UserMistakeWithQuestion[];
};

export function MistakesListDialog({
  open,
  onOpenChange,
  mistakes,
}: MistakesListDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto touch-scroll sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Your mistakes</DialogTitle>
          <DialogDescription>
            Questions you got wrong in recent matches. Practice each one 3 times
            correctly in a row to remove it from this list. Match accuracy
            percentages stay unchanged.
          </DialogDescription>
        </DialogHeader>

        {mistakes.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-6 text-center">
            <CheckCircle2 className="mx-auto size-8 text-emerald-400" />
            <p className="mt-3 font-medium text-emerald-100">No mistakes saved</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Wrong answers from your next match will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {mistakes.map((mistake) => (
              <li
                key={mistake.id}
                className="rounded-xl border border-border/60 bg-card/60 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs uppercase">
                    {formatCategoryLabel(mistake.question.category)}
                  </Badge>
                  <Badge variant="outline" className="tabular-nums">
                    Practice {mistake.practice_streak}/3
                  </Badge>
                </div>

                <p className="text-sm font-medium leading-snug sm:text-base">
                  {mistake.question.question_text}
                </p>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-destructive/90">
                        Your last answer
                      </p>
                      <p className="text-foreground">
                        {mistake.selected_answer ? (
                          <>
                            <span className="font-semibold text-destructive">
                              {mistake.selected_answer}.
                            </span>{" "}
                            {getOptionText(
                              mistake.question,
                              mistake.selected_answer
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            No answer / timed out
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex gap-2 rounded-lg border px-3 py-2",
                      "border-emerald-500/30 bg-emerald-500/10"
                    )}
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Correct answer
                      </p>
                      <p className="text-foreground">
                        <span className="font-semibold text-emerald-400">
                          {mistake.question.correct_answer}.
                        </span>{" "}
                        {getOptionText(
                          mistake.question,
                          mistake.question.correct_answer
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
