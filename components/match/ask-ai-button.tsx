"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { askQuestionExplanation } from "@/app/(app)/match/ai-actions";
import { MAX_AI_ASKS_PER_MATCH } from "@/lib/ai-explanations";
import { formatCategoryLabel } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { ExplanationMarkdown } from "@/components/match/explanation-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MatchRoundReview } from "@/store/useGameStore";
import { cn } from "@/lib/utils";
import { useT } from "@/components/ui-language-provider";

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
  const t = useT();
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
        toast.error(t(result.error));
        onAsksRemainingChange(result.asksRemaining);
        return;
      }

      setExplanation(result.explanation);
      setFromCache(result.fromCache);
      onAsksRemainingChange(result.asksRemaining);

      if (result.fromCache) {
        toast.success(t("Loaded saved explanation."));
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
            ? "min-h-11 shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            : "size-11 shrink-0 text-muted-foreground hover:text-primary",
          className
        )}
        onClick={() => handleOpenChange(true)}
        aria-label={t("Ask AI for an explanation")}
      >
        <Sparkles className="size-4" />
        {showLabel ? t("Ask AI") : null}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto touch-scroll sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("AI explanation")}</DialogTitle>
            <DialogDescription>
              {asksRemaining > 0
                ? t(
                    scopeLabel === "match"
                      ? "{n} new AI explanations left this match (max {max}). Re-opening a question you already asked does not use a slot."
                      : "{n} new AI explanations left this practice session (max {max}). Re-opening a question you already asked does not use a slot.",
                    { n: asksRemaining, max: MAX_AI_ASKS_PER_MATCH }
                  )
                : t(
                    scopeLabel === "match"
                      ? "You have used all {max} new AI explanations for this match."
                      : "You have used all {max} new AI explanations for this practice session.",
                    { max: MAX_AI_ASKS_PER_MATCH }
                  )}
            </DialogDescription>
          </DialogHeader>

          <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm leading-relaxed">
            {round.questionText}
          </p>

          {isPending && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              {t("Thinking...")}
            </div>
          )}

          {!isPending && explanation && (
            <div className="space-y-2">
              {fromCache && (
                <p className="text-xs text-muted-foreground">
                  {t("Loaded from cache — no AI slot used.")}
                </p>
              )}
              <ExplanationMarkdown
                content={explanation}
                className="rounded-lg border border-border bg-primary/5 px-3 py-3 text-sm leading-relaxed"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
