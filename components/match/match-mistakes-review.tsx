"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMatchRoundReviews,
  useGameStore,
  type MatchRoundReview,
} from "@/store/useGameStore";
import { AskAiButton } from "@/components/match/ask-ai-button";
import { ReportQuestionButton } from "@/components/match/report-question-button";
import { MAX_AI_ASKS_PER_MATCH } from "@/lib/ai-explanations";
import { formatCategoryLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { useT, useUiLanguage } from "@/components/ui-language-provider";
import { getOptionText, localizeQuestion } from "@/lib/resolve-match-questions";
import type { QuestionCategory } from "@/types/database.types";

const CATEGORY_ORDER: QuestionCategory[] = [
  "grammar",
  "vocabulary",
  "fill-in-the-blank",
  "idioms",
];

type CategoryFilter = "all" | QuestionCategory;

/** Each round's texts in the app language, from the match's own copy of its question. */
function useLocalizedRounds(rounds: MatchRoundReview[]) {
  const uiLanguage = useUiLanguage();
  const playlist = useGameStore((state) => state.playlist);
  const tiebreaker = useGameStore((state) => state.tiebreakerQuestion);
  return useMemo(() => {
    if (uiLanguage === "en") return rounds;
    const questions = new Map([...playlist, ...(tiebreaker ? [tiebreaker] : [])].map((q) => [q.id, q]));
    return rounds.map((round) => {
      const question = questions.get(round.questionId);
      if (!question?.text_tr) return round;
      const shown = localizeQuestion(question, uiLanguage);
      return {
        ...round,
        questionText: shown.question_text,
        correctOptionText: getOptionText(shown, round.correctAnswer),
        selectedOptionText: round.selectedAnswer ? getOptionText(shown, round.selectedAnswer) : null,
      };
    });
  }, [rounds, playlist, tiebreaker, uiLanguage]);
}

function RoundReviewCard({
  round,
  sessionId,
  asksRemaining,
  onAsksRemainingChange,
  reported,
  onReported,
}: {
  round: MatchRoundReview;
  sessionId: string;
  asksRemaining: number;
  onAsksRemainingChange: (remaining: number) => void;
  reported: boolean;
  onReported: () => void;
}) {
  const t = useT();
  return (
    <li
      className={cn(
        "rounded-xl border p-4",
        round.wasCorrect
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-destructive/30 bg-destructive/5"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {round.isTiebreaker ? t("Tiebreaker") : `Q${round.questionIndex + 1}`}
        </Badge>
        <Badge variant="secondary" className="text-xs uppercase">
          {t(formatCategoryLabel(round.category))}
        </Badge>
        {round.wasCorrect ? (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            {t("Correct")}
          </Badge>
        ) : (
          <Badge variant="destructive">{t("Wrong")}</Badge>
        )}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {t("+{n} pts", { n: round.pointsEarned })}
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
                {t("Your answer")}
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
                  <span className="text-muted-foreground">{t("No answer / timed out")}</span>
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
              {round.wasCorrect ? t("Your answer") : t("Correct answer")}
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

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/40 pt-3">
        <AskAiButton
          round={round}
          sessionId={sessionId}
          asksRemaining={asksRemaining}
          onAsksRemainingChange={onAsksRemainingChange}
          showLabel
        />
        <ReportQuestionButton
          questionId={round.questionId}
          questionText={round.questionText}
          showLabel
          reported={reported}
          onReported={onReported}
        />
      </div>
    </li>
  );
}

function CategorySummary() {
  const t = useT();
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
        {t("By topic")}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map(({ category, correct, total }) => {
          const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
          return (
            <li
              key={category}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-sm"
            >
              <span className="truncate">{t(formatCategoryLabel(category))}</span>
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
  const t = useT();
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
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
        )}
      >
        {t("All topics")}
      </button>
      {categoriesInMatch.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === category
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground"
          )}
        >
          {t(formatCategoryLabel(category))}
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
  sessionId,
  asksRemaining,
  onAsksRemainingChange,
  reportedQuestionIds,
  onQuestionReported,
  emptyMessage = "No mistakes in this filter",
  emptyDescription = "Try another topic or check All questions.",
}: {
  rounds: MatchRoundReview[];
  sessionId: string;
  asksRemaining: number;
  onAsksRemainingChange: (remaining: number) => void;
  reportedQuestionIds: Set<string>;
  onQuestionReported: (questionId: string) => void;
  emptyMessage?: string;
  emptyDescription?: string;
}) {
  const t = useT();
  if (rounds.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-left">
        <CheckCircle2 className="size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium text-foreground">{t(emptyMessage)}</p>
          <p className="text-sm text-muted-foreground">{t(emptyDescription)}</p>
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
          sessionId={sessionId}
          asksRemaining={asksRemaining}
          onAsksRemainingChange={onAsksRemainingChange}
          reported={reportedQuestionIds.has(round.questionId)}
          onReported={() => onQuestionReported(round.questionId)}
        />
      ))}
    </ul>
  );
}

type ReviewTab = "mistakes" | "all";

export function MatchMistakesReview() {
  const t = useT();
  const allRounds = useLocalizedRounds(useMatchRoundReviews());
  const mistakes = useMemo(() => allRounds.filter((round) => !round.wasCorrect), [allRounds]);
  const gameSessionId = useGameStore((state) => state.gameSessionId);
  const [asksRemaining, setAsksRemaining] = useState(MAX_AI_ASKS_PER_MATCH);
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

  if (!gameSessionId) {
    return null;
  }

  if (allRounds.length === 0) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card/50 p-5 text-left sm:p-6">
        <h2 className="text-base font-semibold">{t("Match review")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Question breakdown is not available for this match. Play another round and the review will appear here when the match ends.")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-4 rounded-2xl border border-border bg-card/50 p-4 text-left sm:p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">
          {t("Match review")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("{n}/{total} correct", { n: correctCount, total: totalRegular })}
          {mistakes.length > 0
            ? ` · ${mistakes.length === 1 ? t("1 mistake to review") : t("{n} mistakes to review", { n: mistakes.length })}`
            : ` · ${t("perfect round")}`}
          {" · "}
          {t("Ask AI (up to {n}/match) or Report to flag a question", { n: MAX_AI_ASKS_PER_MATCH })}
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
          {t("Your mistakes")}
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
          {t("All questions")}
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
            sessionId={gameSessionId}
            asksRemaining={asksRemaining}
            onAsksRemainingChange={setAsksRemaining}
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
            sessionId={gameSessionId}
            asksRemaining={asksRemaining}
            onAsksRemainingChange={setAsksRemaining}
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
