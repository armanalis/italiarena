"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMatchMistakes,
  useMatchRoundReviews,
  useGameStore,
  type MatchRoundReview,
} from "@/store/useGameStore";
import { formatCategoryLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { QuestionCategory } from "@/types/database.types";

const CATEGORY_ORDER: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

function RoundReviewCard({ round }: { round: MatchRoundReview }) {
  return (
    <li
      className={cn(
        "rounded-xl border p-4",
        round.wasCorrect
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-border/60 bg-card/60"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {round.isTiebreaker ? "Tiebreaker" : `Q${round.questionIndex + 1}`}
        </Badge>
        <Badge variant="secondary" className="text-xs uppercase">
          {formatCategoryLabel(round.category)}
        </Badge>
        {round.wasCorrect ? (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            Correct
          </Badge>
        ) : (
          <Badge variant="destructive">Wrong</Badge>
        )}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          +{round.pointsEarned} pts
        </span>
      </div>

      <p className="text-sm font-medium leading-snug sm:text-base">
        {round.questionText}
      </p>

      <div className="mt-3 space-y-2 text-sm">
        {!round.wasCorrect && (
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
        )}

        <div
          className={cn(
            "flex gap-2 rounded-lg border px-3 py-2",
            round.wasCorrect
              ? "border-emerald-500/30 bg-emerald-500/10"
              : "border-border/60 bg-muted/20"
          )}
        >
          {round.wasCorrect ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400/80" />
          )}
          <div>
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-wide",
                round.wasCorrect ? "text-emerald-400/90" : "text-muted-foreground"
              )}
            >
              {round.wasCorrect ? "Your answer" : "Correct answer"}
            </p>
            <p className="text-foreground">
              <span
                className={cn(
                  "font-semibold",
                  round.wasCorrect ? "text-emerald-400" : "text-emerald-400/90"
                )}
              >
                {round.wasCorrect ? round.selectedAnswer : round.correctAnswer}.
              </span>{" "}
              {round.wasCorrect ? round.selectedOptionText : round.correctOptionText}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

function CategorySummary() {
  const categoryProgress = useGameStore((state) => state.categoryProgress);

  const rows = CATEGORY_ORDER.map((category) => {
    const stats = categoryProgress[category];
    if (!stats || stats.total === 0) {
      return null;
    }
    return { category, ...stats };
  }).filter(Boolean) as { category: QuestionCategory; correct: number; total: number }[];

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        By topic
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ category, correct, total }) => {
          const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
          return (
            <li
              key={category}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm"
            >
              <span className="truncate">{formatCategoryLabel(category)}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {correct}/{total}
                <span className="ml-1.5 text-foreground">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoundList({
  rounds,
  emptyMessage = "No mistakes",
  emptyDescription = "You answered every question correctly this match.",
}: {
  rounds: MatchRoundReview[];
  emptyMessage?: string;
  emptyDescription?: string;
}) {
  if (rounds.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
        <div>
          <p className="font-medium text-emerald-100">{emptyMessage}</p>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="max-h-[min(50vh,28rem)] space-y-3 overflow-y-auto touch-scroll pr-1">
      {rounds.map((round) => (
        <RoundReviewCard
          key={`${round.questionId}-${round.questionIndex}`}
          round={round}
        />
      ))}
    </ul>
  );
}

export function MatchMistakesReview() {
  const allRounds = useMatchRoundReviews();
  const mistakes = useMatchMistakes();

  const regularRounds = allRounds.filter((round) => !round.isTiebreaker);
  const correctCount = regularRounds.filter((round) => round.wasCorrect).length;
  const totalRegular = regularRounds.length;

  if (allRounds.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-xl space-y-4 text-left">
      <div className="space-y-1 px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Match review
        </h2>
        <p className="text-sm text-muted-foreground">
          {correctCount}/{totalRegular} correct
          {mistakes.length > 0
            ? ` · ${mistakes.length} to practice`
            : " · perfect round"}
        </p>
      </div>

      <CategorySummary />

      <Tabs defaultValue={mistakes.length > 0 ? "mistakes" : "all"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mistakes">
            Mistakes
            {mistakes.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 tabular-nums">
                {mistakes.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">
            All questions
            <Badge variant="outline" className="ml-1.5 tabular-nums">
              {allRounds.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mistakes" className="mt-3">
          <RoundList rounds={mistakes} />
        </TabsContent>

        <TabsContent value="all" className="mt-3">
          <RoundList rounds={allRounds} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
