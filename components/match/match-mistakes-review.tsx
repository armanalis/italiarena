"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useMatchMistakes } from "@/store/useGameStore";
import { formatCategoryLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function MatchMistakesReview() {
  const mistakes = useMatchMistakes();

  if (mistakes.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
        <div>
          <p className="font-medium text-emerald-100">No mistakes</p>
          <p className="text-sm text-muted-foreground">
            You answered every question correctly this match.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-3 text-left">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Review your mistakes
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {mistakes.length} wrong
        </Badge>
      </div>

      <ul className="max-h-[min(50vh,28rem)] space-y-3 overflow-y-auto touch-scroll pr-1">
        {mistakes.map((round) => (
          <li
            key={`${round.questionId}-${round.questionIndex}`}
            className="rounded-xl border border-border/60 bg-card/60 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {round.isTiebreaker
                  ? "Tiebreaker"
                  : `Q${round.questionIndex + 1}`}
              </Badge>
              <Badge variant="secondary" className="text-xs uppercase">
                {formatCategoryLabel(round.category)}
              </Badge>
            </div>

            <p className="text-sm font-medium leading-snug sm:text-base">
              {round.questionText}
            </p>

            <div className="mt-3 space-y-2 text-sm">
              <div
                className={cn(
                  "flex gap-2 rounded-lg border px-3 py-2",
                  "border-destructive/30 bg-destructive/10"
                )}
              >
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-destructive/90">
                    Your answer
                  </p>
                  <p className="text-foreground">
                    {round.selectedAnswer ? (
                      <>
                        <span className="font-semibold text-destructive">
                          {round.selectedAnswer}.
                        </span>{" "}
                        {round.selectedOptionText}
                      </>
                    ) : (
                      <span className="text-muted-foreground">No answer / timed out</span>
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
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
                    Correct answer
                  </p>
                  <p className="text-foreground">
                    <span className="font-semibold text-emerald-400">
                      {round.correctAnswer}.
                    </span>{" "}
                    {round.correctOptionText}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
