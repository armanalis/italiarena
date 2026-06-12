"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { askQuestionExplanation } from "@/app/dashboard/match/ai-actions";
import { MAX_AI_ASKS_PER_MATCH } from "@/lib/ai-explanations";
import { formatCategoryLabel } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MatchRoundReview } from "@/store/useGameStore";
import { cn } from "@/lib/utils";

type AskAiButtonProps = {
  round: MatchRoundReview;
  sessionId: string;
  asksRemaining: number;
  onAsksRemainingChange: (remaining: number) => void;
  className?: string;
  showLabel?: boolean;
  /** e.g. "match" or "practice session" — shown in the quota hint. */
  scopeLabel?: string;
};

export function AskAiButton({
  round,
  sessionId,
  asksRemaining,
  onAsksRemainingChange,
  className,
  showLabel = false,
  scopeLabel = "match",
}: AskAiButtonProps) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loadExplanation() {
    startTransition(async () => {
      const result = await askQuestionExplanation({
        sessionId,
        questionId: round.questionId,
        category: formatCategoryLabel(round.category),
        questionText: round.questionText,
        correctAnswer: round.correctAnswer,
        correctOptionText: round.correctOptionText,
        selectedAnswer: round.selectedAnswer,
        selectedOptionText: round.selectedOptionText,
        wasCorrect: round.wasCorrect,
      });

      if (!result.success) {
        toast.error(result.error);
        onAsksRemainingChange(result.asksRemaining);
        return;
      }

      setExplanation(result.explanation);
      setFromCache(result.fromCache);
      onAsksRemainingChange(result.asksRemaining);

      if (result.fromCache) {
        toast.success("Loaded saved explanation.");
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen && !explanation && !isPending) {
      loadExplanation();
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={showLabel ? "outline" : "ghost"}
        size={showLabel ? "sm" : "icon"}
        disabled={isPending}
        className={cn(
          showLabel
            ? "shrink-0 gap-1.5 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200"
            : "size-11 shrink-0 text-muted-foreground hover:text-indigo-300",
          className
        )}
        onClick={() => handleOpenChange(true)}
        aria-label="Ask AI for an explanation"
      >
        <Sparkles className="size-4" />
        {showLabel ? "Ask AI" : null}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto touch-scroll sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI explanation</DialogTitle>
            <DialogDescription>
              {asksRemaining > 0
                ? `${asksRemaining} new AI explanation${asksRemaining === 1 ? "" : "s"} left this ${scopeLabel} (max ${MAX_AI_ASKS_PER_MATCH}). Re-opening a question you already asked does not use a slot.`
                : `You have used all ${MAX_AI_ASKS_PER_MATCH} new AI explanations for this ${scopeLabel}.`}
            </DialogDescription>
          </DialogHeader>

          <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm leading-relaxed">
            {round.questionText}
          </p>

          {isPending && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-indigo-400" />
              Thinking...
            </div>
          )}

          {!isPending && explanation && (
            <div className="space-y-2">
              {fromCache && (
                <p className="text-xs text-muted-foreground">
                  Loaded from cache — no AI slot used.
                </p>
              )}
              <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/5 px-3 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                {explanation}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
