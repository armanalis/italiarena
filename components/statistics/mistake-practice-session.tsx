"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  submitMistakePracticeAnswer,
  type UserMistakeWithQuestion,
} from "@/app/dashboard/statistics/actions";
import { AskAiButton } from "@/components/match/ask-ai-button";
import { ReportQuestionButton } from "@/components/match/report-question-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MAX_AI_ASKS_PER_MATCH } from "@/lib/ai-explanations";
import { formatCategoryLabel, getOptionText } from "@/lib/scoring";
import type { MatchRoundReview } from "@/store/useGameStore";
import type { CorrectAnswer } from "@/types/database.types";
import { cn } from "@/lib/utils";

const OPTIONS: CorrectAnswer[] = ["A", "B", "C", "D"];

type MistakePracticeSessionProps = {
  initialMistakes: UserMistakeWithQuestion[];
  practiceSessionId: string;
  onClose: () => void;
  onMistakesChange?: (mistakes: UserMistakeWithQuestion[]) => void;
};

type FeedbackState = {
  selected: CorrectAnswer;
  correct: boolean;
  practiceStreak: number;
  mastered: boolean;
};

function shuffleMistakes(mistakes: UserMistakeWithQuestion[]) {
  const copy = [...mistakes];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function MistakePracticeSession({
  initialMistakes,
  practiceSessionId,
  onClose,
  onMistakesChange,
}: MistakePracticeSessionProps) {
  const [queue, setQueue] = useState(() => shuffleMistakes(initialMistakes));
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [masteredCount, setMasteredCount] = useState(0);
  const [asksRemaining, setAsksRemaining] = useState(MAX_AI_ASKS_PER_MATCH);
  const [reportedQuestionIds, setReportedQuestionIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isPending, startTransition] = useTransition();

  const current = queue[index] ?? null;

  const remainingLabel = useMemo(() => {
    if (queue.length === 0) {
      return "All done";
    }
    return `${queue.length} question${queue.length === 1 ? "" : "s"} left`;
  }, [queue.length]);

  function syncMistakes(nextQueue: UserMistakeWithQuestion[]) {
    onMistakesChange?.(nextQueue);
  }

  function advanceQueue(
    mastered: boolean,
    practiceStreak: number
  ) {
    if (!current) {
      return;
    }

    setFeedback(null);

    if (mastered) {
      setMasteredCount((count) => count + 1);
      setQueue((items) => {
        const nextQueue = items.filter((item) => item.id !== current.id);
        syncMistakes(nextQueue);
        return nextQueue;
      });
      setIndex(0);
      return;
    }

    setQueue((items) => {
      const nextQueue = items.map((item) =>
        item.id === current.id
          ? { ...item, practice_streak: practiceStreak }
          : item
      );
      syncMistakes(nextQueue);
      return nextQueue;
    });
    setIndex((value) => (value + 1) % queue.length);
  }

  function handleSelect(answer: CorrectAnswer) {
    if (!current || feedback || isPending) {
      return;
    }

    startTransition(async () => {
      const result = await submitMistakePracticeAnswer(
        current.question_id,
        answer
      );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      setFeedback({
        selected: answer,
        correct: result.correct,
        practiceStreak: result.practiceStreak,
        mastered: result.mastered,
      });

      if (!result.mastered) {
        setQueue((items) => {
          const nextQueue = items.map((item) =>
            item.id === current.id
              ? { ...item, practice_streak: result.practiceStreak }
              : item
          );
          syncMistakes(nextQueue);
          return nextQueue;
        });
      }

      if (result.mastered) {
        toast.success("Mastered — removed from your mistake list.");
      } else if (result.correct) {
        toast.success(`Correct · ${result.practiceStreak}/3 in a row`);
      }
    });
  }

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-emerald-400" />
        <h2 className="mt-4 text-xl font-semibold">Practice complete</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {masteredCount > 0
            ? `You mastered ${masteredCount} question${masteredCount === 1 ? "" : "s"}.`
            : "No mistakes left to practice."}
        </p>
        <Button type="button" className="mt-6 min-h-11" onClick={onClose}>
          Back to statistics
        </Button>
      </div>
    );
  }

  if (!current) {
    return null;
  }

  const question = current.question;

  const aiRound: MatchRoundReview | null = feedback
    ? {
        questionIndex: index,
        isTiebreaker: false,
        questionId: question.id,
        category: question.category,
        questionText: question.question_text,
        correctAnswer: question.correct_answer,
        correctOptionText: getOptionText(question, question.correct_answer),
        selectedAnswer: feedback.selected,
        selectedOptionText: getOptionText(question, feedback.selected),
        wasCorrect: feedback.correct,
        pointsEarned: 0,
      }
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 gap-2"
          onClick={onClose}
        >
          <ArrowLeft className="size-4" />
          Back to statistics
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="tabular-nums">
            {remainingLabel}
          </Badge>
          {masteredCount > 0 && (
            <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
              {masteredCount} mastered
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary" className="uppercase tracking-wide">
              {formatCategoryLabel(question.category)}
            </Badge>
            <ReportQuestionButton
              questionId={question.id}
              questionText={question.question_text}
              showLabel
              pauseMatchTimer={false}
              reported={reportedQuestionIds.has(question.id)}
              onReported={() =>
                setReportedQuestionIds((ids) => new Set(ids).add(question.id))
              }
            />
          </div>
          <h2 className="text-lg font-semibold leading-snug sm:text-2xl">
            {question.question_text}
          </h2>
          <p className="text-sm text-muted-foreground">
            Practice streak for this question: {current.practice_streak}/3
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {OPTIONS.map((key) => {
            const text = question[`option_${key.toLowerCase()}` as keyof typeof question] as string;
            const isSelected = feedback?.selected === key;
            const showCorrect =
              feedback &&
              key === question.correct_answer &&
              !feedback.correct;
            const showWrong = feedback && isSelected && !feedback.correct;

            return (
              <button
                key={key}
                type="button"
                disabled={Boolean(feedback) || isPending}
                onClick={() => handleSelect(key)}
                className={cn(
                  "min-h-12 rounded-2xl border px-3 py-3 text-left text-sm transition-all sm:px-4 sm:py-4 sm:text-base",
                  "border-border/60 bg-card/60 hover:border-primary/30 hover:bg-primary/5",
                  "disabled:cursor-not-allowed disabled:opacity-80",
                  showCorrect &&
                    "border-emerald-500/50 bg-emerald-500/15",
                  showWrong &&
                    "border-destructive bg-destructive/15 ring-2 ring-destructive/30",
                  isSelected &&
                    feedback?.correct &&
                    "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30"
                )}
              >
                <span className="flex items-start gap-2">
                  <span
                    className={cn(
                      "font-semibold",
                      showWrong && "text-destructive",
                      (showCorrect || (isSelected && feedback?.correct)) &&
                        "text-emerald-400",
                      !showWrong &&
                        !(showCorrect || (isSelected && feedback?.correct)) &&
                        "text-primary"
                    )}
                  >
                    {key}.
                  </span>
                  <span
                    className={cn("flex-1", showWrong && "text-destructive")}
                  >
                    {text}
                  </span>
                  {showWrong && (
                    <XCircle
                      className="size-5 shrink-0 text-destructive"
                      aria-label="Wrong answer"
                    />
                  )}
                  {isSelected && feedback?.correct && (
                    <CheckCircle2
                      className="size-5 shrink-0 text-emerald-400"
                      aria-label="Correct answer"
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {isPending && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking answer...
          </div>
        )}

        {feedback && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3",
              feedback.correct
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-destructive/50 bg-destructive/15"
            )}
          >
            <div className="flex items-start gap-2">
              {feedback.correct ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
              )}
              <div className="space-y-1 text-sm">
                <p
                  className={cn(
                    "font-semibold",
                    feedback.correct ? "text-emerald-400" : "text-destructive"
                  )}
                >
                  {feedback.mastered
                    ? "Mastered — this question leaves your mistake list."
                    : feedback.correct
                      ? `Correct · ${feedback.practiceStreak}/3 in a row`
                      : "Wrong answer — streak reset to 0."}
                </p>
                {!feedback.correct && (
                  <p className="text-muted-foreground">
                    Correct answer:{" "}
                    <span className="font-semibold text-emerald-400">
                      {question.correct_answer}.
                    </span>{" "}
                    {getOptionText(question, question.correct_answer)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {feedback && aiRound && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AskAiButton
              round={aiRound}
              sessionId={practiceSessionId}
              asksRemaining={asksRemaining}
              onAsksRemainingChange={setAsksRemaining}
              showLabel
              scopeLabel="practice session"
            />
            <Button
              type="button"
              className="min-h-11"
              onClick={() =>
                advanceQueue(feedback.mastered, feedback.practiceStreak)
              }
            >
              {feedback.mastered ? "Next question" : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
