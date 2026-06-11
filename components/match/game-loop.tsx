"use client";

import Link from "next/link";
import { Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGameLoop } from "@/hooks/useGameLoop";
import {
  useGameStore,
  useGameStoreHydrated,
  usePlayerAScore,
  usePlayerBScore,
} from "@/store/useGameStore";
import { BOT_DIFFICULTY_LABELS } from "@/lib/bot";
import { formatCategoryLabel, isAnswerCorrect } from "@/lib/scoring";
import { MatchMistakesReview } from "@/components/match/match-mistakes-review";
import { MatchReviewBoundary } from "@/components/match/match-review-boundary";
import { ReportQuestionButton } from "@/components/match/report-question-button";
import { SoundVolumeControl } from "@/components/sound-volume-control";
import type { CorrectAnswer } from "@/types/database.types";
import type { ProficiencyLevel } from "@/lib/constants";
import { cn } from "@/lib/utils";

type GameLoopProps = {
  sessionId: string;
  localUserId: string;
  localPlayerRole: "a" | "b";
  isBotMatch: boolean;
  proficiencyLevel: ProficiencyLevel;
  playerAName: string;
  playerBName: string;
};

const OPTIONS: { key: CorrectAnswer; label: string }[] = [
  { key: "A", label: "option_a" },
  { key: "B", label: "option_b" },
  { key: "C", label: "option_c" },
  { key: "D", label: "option_d" },
];

export function GameLoop({
  sessionId,
  localUserId,
  localPlayerRole,
  isBotMatch,
  proficiencyLevel,
  playerAName,
  playerBName,
}: GameLoopProps) {
  const hydrated = useGameStoreHydrated();
  const playerAScore = usePlayerAScore();
  const playerBScore = usePlayerBScore();
  const matchWinner = useGameStore((state) => state.matchWinner);
  const lastRoundPointsA = useGameStore((state) => state.lastRoundPointsA);
  const lastRoundPointsB = useGameStore((state) => state.lastRoundPointsB);
  const localPlayerRoleStore = useGameStore((state) => state.localPlayerRole);
  const reset = useGameStore((state) => state.reset);
  const tiebreakerUsed = useGameStore((state) => state.tiebreakerUsed);
  const botDifficulty = useGameStore((state) => state.botDifficulty);

  const {
    roundPhase,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isTiebreakerRound,
    timeRemaining,
    handleSelectAnswer,
    playerAAnswer,
    playerBAnswer,
    roundResultSecondsLeft,
    channelReady,
  } = useGameLoop({
    sessionId,
    localUserId,
    localPlayerRole,
    isBotMatch,
    proficiencyLevel,
  });

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!currentQuestion && roundPhase !== "match_finished" && roundPhase !== "tiebreaker_loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Loading match...</p>
      </div>
    );
  }

  if (roundPhase === "waiting" && !isBotMatch) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Loader2 className="size-10 animate-spin text-indigo-400" />
        <div className="space-y-1">
          <p className="text-lg font-semibold">Preparing match</p>
          <p className="text-sm text-muted-foreground">
            Syncing questions with your opponent...
          </p>
        </div>
      </div>
    );
  }

  if (roundPhase === "tiebreaker_loading") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <Loader2 className="size-10 animate-spin text-indigo-400" />
        <div className="space-y-1">
          <p className="text-lg font-semibold">Scores tied</p>
          <p className="text-sm text-muted-foreground">
            Picking a random tiebreaker question from any topic...
          </p>
        </div>
      </div>
    );
  }

  const localAnswer =
    localPlayerRoleStore === "a" ? playerAAnswer : playerBAnswer;
  const opponentAnswer =
    localPlayerRoleStore === "a" ? playerBAnswer : playerAAnswer;
  const isLocked = Boolean(localAnswer);
  const showWaiting =
    roundPhase === "playing" && isLocked && !opponentAnswer;
  const canAnswer = roundPhase === "playing" && !isLocked && channelReady;

  const localDisplayName =
    localPlayerRoleStore === "a" ? playerAName : playerBName;
  const opponentDisplayName =
    localPlayerRoleStore === "a" ? playerBName : playerAName;
  const localLastPoints =
    localPlayerRoleStore === "a" ? lastRoundPointsA : lastRoundPointsB;
  const opponentLastPoints =
    localPlayerRoleStore === "a" ? lastRoundPointsB : lastRoundPointsA;

  if (roundPhase === "match_finished") {
    const didWin =
      (matchWinner === "a" && localPlayerRoleStore === "a") ||
      (matchWinner === "b" && localPlayerRoleStore === "b");
    const isTie = matchWinner === "tie";

    return (
      <main className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-scroll">
        <div className="flex shrink-0 flex-col items-center gap-3 px-4 py-5 text-center sm:gap-4 sm:px-8 sm:py-6">
          <div className="rounded-full border border-indigo-500/30 bg-indigo-500/10 p-4 sm:p-5">
            <Trophy className="size-9 text-indigo-400 sm:size-10" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {isTie ? "It's a tie!" : didWin ? "You win!" : "You lose!"}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Final score · {playerAName} {playerAScore} — {playerBName}{" "}
              {playerBScore}
            </p>
            {isTie && (
              <p className="text-sm text-muted-foreground">
                {tiebreakerUsed
                  ? "Still tied after the sudden-death round — fastest average response time wins."
                  : "Tie-breaker: fastest average response time"}
              </p>
            )}
            {tiebreakerUsed && !isTie && (
              <p className="text-sm text-muted-foreground">
                Decided by sudden-death tiebreaker.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 px-4 pb-10 sm:px-8 sm:pb-12">
          <p className="max-w-xl text-center text-sm font-medium text-foreground">
            Scroll down to review your mistakes and all questions from this match.
          </p>
          <MatchReviewBoundary>
            <MatchMistakesReview />
          </MatchReviewBoundary>

          <div className="flex w-full max-w-xl flex-col items-center gap-3 border-t border-border/60 pt-6 sm:flex-row sm:justify-center">
            <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
              <Link href="/dashboard" onClick={() => reset()}>
                Back to dashboard
              </Link>
            </Button>
            <Button asChild className="min-h-11 w-full sm:w-auto">
              <Link href="/dashboard/matchmaking" onClick={() => reset()}>
                Play again
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto touch-scroll">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <p className="text-sm font-semibold tabular-nums text-foreground sm:text-base">
            {isTiebreakerRound
              ? "Tiebreaker"
              : `Question ${currentQuestionIndex + 1}/${totalQuestions}`}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium sm:gap-3 sm:text-sm">
            <span className="truncate">
              {playerAName} · {playerAScore}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="truncate">
              {playerBName} · {playerBScore}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SoundVolumeControl />
          {isBotMatch && (
            <Badge variant="secondary">
              {botDifficulty ? BOT_DIFFICULTY_LABELS[botDifficulty] : "Bot"}
            </Badge>
          )}
          <Badge
            variant={timeRemaining <= 5 ? "destructive" : "outline"}
            className="min-w-14 justify-center font-mono tabular-nums"
          >
            {timeRemaining}s
          </Badge>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center p-3 py-4 sm:p-6">
        {roundPhase === "topic_reveal" && currentQuestion && (
          <div className="animate-in fade-in zoom-in flex min-h-[180px] w-full max-w-xl items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-violet-500/10 p-6 text-center duration-300 sm:min-h-[280px] sm:p-12">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-300 sm:text-sm sm:tracking-[0.35em]">
                {isTiebreakerRound ? "Sudden death" : "Up next"}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-4xl">
                {formatCategoryLabel(currentQuestion.category)}
              </h2>
            </div>
          </div>
        )}

        {roundPhase === "playing" && currentQuestion && (
            <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
              <div className="space-y-2 text-center sm:space-y-3">
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {formatCategoryLabel(currentQuestion.category)}
                </Badge>
                <h2 className="text-lg font-semibold leading-snug sm:text-2xl">
                  {currentQuestion.question_text}
                </h2>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                {OPTIONS.map(({ key, label }) => {
                  const text = currentQuestion[label as keyof typeof currentQuestion] as string;
                  const isSelected = localAnswer?.answer === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canAnswer || isLocked}
                      onClick={() => handleSelectAnswer(key)}
                      className={cn(
                        "touch-target min-h-12 rounded-xl border px-3 py-3 text-left text-sm transition-all active:scale-[0.99] sm:px-4 sm:py-4 sm:text-base",
                        "border-border/60 bg-card/60 hover:border-indigo-500/40 hover:bg-indigo-500/5",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                        isSelected &&
                          "border-indigo-500 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
                      )}
                    >
                      <span className="mr-2 font-semibold text-indigo-400">
                        {key}.
                      </span>
                      {text}
                    </button>
                  );
                })}
              </div>

              {!channelReady && !isBotMatch && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Connecting to opponent...
                </div>
              )}

              {showWaiting && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Waiting for {opponentDisplayName}...
                </div>
              )}
            </div>
          )}

        {roundPhase === "round_result" && currentQuestion && (
          <div className="w-full max-w-xl animate-in fade-in space-y-4 duration-300 sm:space-y-6">
            <div className="flex flex-col items-center gap-3 px-1 sm:px-2">
              <p className="text-center text-sm leading-relaxed text-muted-foreground">
                {currentQuestion.question_text}
              </p>
              <ReportQuestionButton
                questionId={currentQuestion.id}
                questionText={currentQuestion.question_text}
                showLabel
              />
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-5 text-center sm:p-8">
              <p className="text-xs uppercase tracking-widest text-muted-foreground sm:text-sm">
                Correct answer
              </p>
              <h2 className="mt-2 text-2xl font-bold text-emerald-400 sm:text-3xl">
                {currentQuestion.correct_answer}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
                {
                  currentQuestion[
                    `option_${currentQuestion.correct_answer.toLowerCase()}` as
                      | "option_a"
                      | "option_b"
                      | "option_c"
                      | "option_d"
                  ]
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-sm sm:gap-3">
              <div className="rounded-xl border border-border/60 bg-card/50 p-3 sm:p-4">
                <p className="truncate text-muted-foreground">{localDisplayName}</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">
                  +{localLastPoints}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localAnswer?.answer
                    ? isAnswerCorrect(
                        localAnswer.answer,
                        currentQuestion.correct_answer
                      )
                      ? "Correct"
                      : "Wrong"
                    : "Timed out"}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-3 sm:p-4">
                <p className="truncate text-muted-foreground">{opponentDisplayName}</p>
                <p className="mt-1 text-xl font-bold sm:text-2xl">
                  +{opponentLastPoints}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {opponentAnswer?.answer
                    ? isAnswerCorrect(
                        opponentAnswer.answer,
                        currentQuestion.correct_answer
                      )
                      ? "Correct"
                      : "Wrong"
                    : "Timed out"}
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {roundResultSecondsLeft !== null ? (
                <>
                  Next question in{" "}
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {roundResultSecondsLeft.toFixed(1)}s
                  </span>
                  {" — "}think the answer is wrong? Tap Report above.
                </>
              ) : (
                "Next question in a moment..."
              )}
            </p>
          </div>
        )}
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border/60 px-3 py-2 text-center text-[10px] text-muted-foreground sm:px-6 sm:py-3 sm:text-xs">
        <span className="font-medium tabular-nums text-foreground">
          {isTiebreakerRound
            ? "Tiebreaker"
            : `Question ${currentQuestionIndex + 1}/${totalQuestions}`}
        </span>
        <span className="hidden text-border sm:inline">|</span>
        <span>
          {playerAName} {playerAScore} · {playerBName} {playerBScore}
        </span>
      </footer>
    </main>
  );
}
