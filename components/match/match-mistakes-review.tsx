"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMatchMistakes,
  useMatchRoundReviews,
  useGameStore,
  type MatchRoundReview,
} from "@/store/useGameStore";
import { ReportQuestionButton } from "@/components/match/report-question-button";
import { formatCategoryLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { QuestionCategory } from "@/types/database.types";

const CATEGORY_ORDER: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

type CategoryFilter = "all" | QuestionCategory;

function RoundReviewCard({
  round,
  reported,
  onReported,
}: {
  round: MatchRoundReview;
  reported: boolean;
  onReported: () => void;
}) {
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
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />
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

      <div className="mt-3 flex items-center justify-end border-t border-border/40 pt-3">
        <ReportQuestionButton
          questionId={round.questionId}
          questionText={round.questionText}
          showLabel
          pauseMatchTimer={false}
          reported={reported}
          onReported={onReported}
        />
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

function CategoryFilterBar({
  value,
  onChange,
  rounds,
}: {
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
  rounds: MatchRoundReview[];
}) {
  const categoriesInMatch = useMemo(() => {
    const set = new Set(rounds.map((round) => round.category));
    return CATEGORY_ORDER.filter((category) => set.has(category));
  }, [rounds]);

  if (categoriesInMatch.length <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          value === "all"
            ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-200"
            : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
        )}
      >
        All topics
      </button>
      {categoriesInMatch.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === category
              ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-200"
              : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
          )}
        >
          {formatCategoryLabel(category)}
        </button>
      ))}
    </div>
  );
}

function filterByCategory(
  rounds: MatchRoundReview[],
  category: CategoryFilter
): MatchRoundReview[] {
  if (category === "all") {
    return rounds;
  }
  return rounds.filter((round) => round.category === category);
}

function RoundList({
  rounds,
  reportedQuestionIds,
  onQuestionReported,
  emptyMessage = "No mistakes in this filter",
  emptyDescription = "Try another topic or check All questions.",
}: {
  rounds: MatchRoundReview[];
  reportedQuestionIds: Set<string>;
  onQuestionReported: (questionId: string) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}) {
  if (rounds.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left">
        <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">{emptyMessage}</p>
          <p className="text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-3 pr-1">
      {rounds.map((round) => (
        <RoundReviewCard
          key={`${round.questionId}-${round.questionIndex}`}
          round={round}
          reported={reportedQuestionIds.has(round.questionId)}
          onReported={() => onQuestionReported(round.questionId)}
        />
      ))}
    </ul>
  );
}

type ReviewTab = "mistakes" | "all";

export function MatchMistakesReview() {
  const allRounds = useMatchRoundReviews();
  const mistakes = useMatchMistakes();
  const [activeTab, setActiveTab] = useState<ReviewTab>(
    mistakes.length > 0 ? "mistakes" : "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Set<string>>(
    () => new Set()
  );

  function markQuestionReported(questionId: string) {
    setReportedQuestionIds((current) => new Set(current).add(questionId));
  }

  const regularRounds = allRounds.filter((round) => !round.isTiebreaker);
  const correctCount = regularRounds.filter((round) => round.wasCorrect).length;
  const totalRegular = regularRounds.length;

  const filteredMistakes = useMemo(
    () => filterByCategory(mistakes, categoryFilter),
    [categoryFilter, mistakes]
  );
  const filteredAll = useMemo(
    () => filterByCategory(allRounds, categoryFilter),
    [allRounds, categoryFilter]
  );

  if (allRounds.length === 0) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card/50 p-5 text-left sm:p-6">
        <h2 className="text-base font-semibold">Match review</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Question breakdown is not available for this match. Play another round
          and the review will appear here when the match ends.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-4 rounded-2xl border border-indigo-500/20 bg-card/50 p-4 text-left sm:p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          Match review
        </h2>
        <p className="text-sm text-muted-foreground">
          {correctCount}/{totalRegular} correct
          {mistakes.length > 0
            ? ` · ${mistakes.length} mistake${mistakes.length === 1 ? "" : "s"} to review`
            : " · perfect round"}
          {" · "}use Report on any question to flag it for admin review
        </p>
      </div>

      <CategorySummary />

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={activeTab === "mistakes" ? "default" : "outline"}
          className="min-h-10"
          onClick={() => setActiveTab("mistakes")}
        >
          Your mistakes
          {mistakes.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 tabular-nums">
              {mistakes.length}
            </Badge>
          )}
        </Button>
        <Button
          type="button"
          variant={activeTab === "all" ? "default" : "outline"}
          className="min-h-10"
          onClick={() => setActiveTab("all")}
        >
          All questions
          <Badge variant="outline" className="ml-1.5 tabular-nums">
            {allRounds.length}
          </Badge>
        </Button>
      </div>

      {activeTab === "mistakes" ? (
        <div className="space-y-3">
          <CategoryFilterBar
            value={categoryFilter}
            onChange={setCategoryFilter}
            rounds={mistakes}
          />
          <RoundList
            rounds={filteredMistakes}
            reportedQuestionIds={reportedQuestionIds}
            onQuestionReported={markQuestionReported}
            emptyMessage={
              mistakes.length === 0
                ? "No mistakes"
                : "No mistakes in this topic"
            }
            emptyDescription={
              mistakes.length === 0
                ? "You answered every question correctly this match."
                : "Select another topic or switch to All questions."
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <CategoryFilterBar
            value={categoryFilter}
            onChange={setCategoryFilter}
            rounds={allRounds}
          />
          <RoundList
            rounds={filteredAll}
            reportedQuestionIds={reportedQuestionIds}
            onQuestionReported={markQuestionReported}
            emptyMessage="No questions in this topic"
            emptyDescription="Select another topic filter above."
          />
        </div>
      )}
    </div>
  );
}
