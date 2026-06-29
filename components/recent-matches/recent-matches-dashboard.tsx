"use client";

import { useState } from "react";
import { ChevronDown, History } from "lucide-react";
import type { CorrectAnswer } from "@/types/database.types";
import type { RecentMatchWithQuestions } from "@/app/dashboard/recent-matches/actions";
import { ReportQuestionButton } from "@/components/match/report-question-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCategoryLabel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type RecentMatchesDashboardProps = {
  matches: RecentMatchWithQuestions[];
  reportedQuestionIds: string[];
};

function resultLabel(result: RecentMatchWithQuestions["result"]) {
  if (result === "win") {
    return "Win";
  }
  if (result === "loss") {
    return "Loss";
  }
  return "Tie";
}

function optionStyle(
  key: CorrectAnswer,
  correctAnswer: CorrectAnswer,
  selectedAnswer: CorrectAnswer | null,
  wasCorrect: boolean
) {
  const isCorrect = key === correctAnswer;
  const isSelected = key === selectedAnswer;

  if (isCorrect) {
    return "border-emerald-500/50 bg-emerald-500/10";
  }

  if (!wasCorrect && isSelected) {
    return "border-destructive/50 bg-destructive/10";
  }

  return "border-border/60 bg-muted/20";
}

function optionLabel(
  key: CorrectAnswer,
  correctAnswer: CorrectAnswer,
  selectedAnswer: CorrectAnswer | null,
  wasCorrect: boolean
) {
  if (key === correctAnswer) {
    return "Correct";
  }
  if (!wasCorrect && key === selectedAnswer) {
    return selectedAnswer ? "Your answer" : "Timed out";
  }
  return null;
}

function MatchQuestionCard({
  question,
  reported,
  onReported,
}: {
  question: RecentMatchWithQuestions["questions"][number];
  reported: boolean;
  onReported: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border p-4",
        question.wasCorrect
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-border/60 bg-card/60"
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          Q{question.questionIndex + 1}
        </Badge>
        <Badge variant="secondary" className="text-xs uppercase">
          {formatCategoryLabel(question.category)}
        </Badge>
        {question.wasCorrect ? (
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
            Correct
          </Badge>
        ) : (
          <Badge variant="destructive">Wrong</Badge>
        )}
      </div>

      <p className="text-sm font-medium leading-snug sm:text-base">
        {question.questionText}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {question.options.map(({ key, text }) => {
          const label = optionLabel(
            key,
            question.correctAnswer,
            question.selectedAnswer,
            question.wasCorrect
          );

          return (
            <div
              key={key}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-sm",
                optionStyle(
                  key,
                  question.correctAnswer,
                  question.selectedAnswer,
                  question.wasCorrect
                )
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p>
                  <span
                    className={cn(
                      "mr-1.5 font-semibold",
                      key === question.correctAnswer && "text-emerald-400",
                      !question.wasCorrect &&
                        key === question.selectedAnswer &&
                        "text-destructive"
                    )}
                  >
                    {key}.
                  </span>
                  {text}
                </p>
                {label && (
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                      label === "Correct" && "text-emerald-400",
                      label !== "Correct" && "text-destructive"
                    )}
                  >
                    {label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!question.wasCorrect && !question.selectedAnswer && (
        <p className="mt-2 text-xs text-muted-foreground">
          You timed out on this question.
        </p>
      )}

      <div className="mt-3 flex justify-end border-t border-border/40 pt-3">
        <ReportQuestionButton
          questionId={question.questionId}
          questionText={question.questionText}
          showLabel
          pauseMatchTimer={false}
          reported={reported}
          onReported={onReported}
        />
      </div>
    </li>
  );
}

function MatchCard({
  match,
  reportedQuestionIds,
  onQuestionReported,
}: {
  match: RecentMatchWithQuestions;
  reportedQuestionIds: Set<string>;
  onQuestionReported: (questionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const correctCount = match.questions.filter((q) => q.wasCorrect).length;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base sm:text-lg">
              vs {match.opponentDisplayName}
            </CardTitle>
            <CardDescription>
              {match.userScore} — {match.opponentScore} · {match.language} ·{" "}
              {match.level}
              {match.opponentType === "ghost" ? " · Bot" : " · Real player"}
            </CardDescription>
            <p className="text-xs text-muted-foreground">
              {new Date(match.playedAt).toLocaleString()}
            </p>
          </div>
          <Badge
            className={cn(
              "shrink-0",
              match.result === "win" && "bg-emerald-500/15 text-emerald-400",
              match.result === "loss" && "bg-destructive/15 text-destructive",
              match.result === "tie" && "bg-muted text-muted-foreground"
            )}
          >
            {resultLabel(match.result)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {match.questions.length > 0 ? (
              <>
                {correctCount}/{match.questions.length} correct
              </>
            ) : (
              "Question list unavailable for this match"
            )}
          </p>
          {match.questions.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9 gap-1.5"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              {expanded ? "Hide questions" : "View all questions"}
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </Button>
          )}
        </div>

        {expanded && match.questions.length > 0 && (
          <ul className="space-y-3 border-t border-border/60 pt-4">
            {match.questions.map((question) => (
              <MatchQuestionCard
                key={`${match.id}-${question.questionId}`}
                question={question}
                reported={reportedQuestionIds.has(question.questionId)}
                onReported={() => onQuestionReported(question.questionId)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentMatchesDashboard({
  matches,
  reportedQuestionIds: initialReportedIds,
}: RecentMatchesDashboardProps) {
  const [reportedQuestionIds, setReportedQuestionIds] = useState(
    () => new Set(initialReportedIds)
  );

  function markQuestionReported(questionId: string) {
    setReportedQuestionIds((current) => new Set(current).add(questionId));
  }

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col">
      <header className="w-full border-b border-border/60 px-4 py-5 sm:px-8 sm:py-6 lg:px-10 xl:px-12">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <History className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Recent matches
            </h1>
            <p className="text-sm text-muted-foreground">
              Your last 10 games with every question from each match. Tap Report
              on any question to flag an issue.
            </p>
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-8 lg:px-10 xl:px-12">
        {matches.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No completed matches yet. Finish a game and all 10 questions will
              show up here.
            </CardContent>
          </Card>
        ) : (
          matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              reportedQuestionIds={reportedQuestionIds}
              onQuestionReported={markQuestionReported}
            />
          ))
        )}
      </div>
    </main>
  );
}
