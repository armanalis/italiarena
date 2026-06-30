"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Trophy, XCircle } from "lucide-react";
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
import { MATCH_SYNC_VERSION } from "@/lib/match-sync";
import { formatCategoryLabel, isAnswerCorrect } from "@/lib/scoring";
import { MatchMistakesReview } from "@/components/match/match-mistakes-review";
import { MatchReviewBoundary } from "@/components/match/match-review-boundary";
import { ReportQuestionButton } from "@/components/match/report-question-button";
import { SoundVolumeControl } from "@/components/sound-volume-control";
import type { CorrectAnswer, QuestionActive } from "@/types/database.types";
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
  serverPlaylist: QuestionActive[];
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
  serverPlaylist,
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
  } = useGameLoop({
    sessionId,
    localUserId,
    localPlayerRole,
    isBotMatch,
    proficiencyLevel,
    serverPlaylist,
  });

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
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
        <Loader2 className="size-10 animate-spin text-primary" />
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
        <Loader2 className="size-10 animate-spin text-primary" />
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
  const localWasCorrect =
    localAnswer?.answer && currentQuestion
      ? isAnswerCorrect(localAnswer.answer, currentQuestion.correct_answer)
      : null;
  const opponentWasCorrect =
    opponentAnswer?.answer && currentQuestion
      ? isAnswerCorrect(opponentAnswer.answer, currentQuestion.correct_answer)
      : null;
  const showWaiting =
    roundPhase === "playing" && isLocked && !opponentAnswer;
  // Answers persist through the database poll, so answering is never gated on
  // the realtime channel being connected.
  const canAnswer = roundPhase === "playing" && !isLocked;

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
          <div className="rounded-full border border-primary/25 bg-primary/10 p-4 sm:p-5">
            <Trophy className="size-9 text-primary sm:size-10" />
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
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-x-2 gap-y-2 border-b border-border/60 px-3 py-2.5 sm:items-center sm:gap-3 sm:px-6 sm:py-4">
        <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
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
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {roundPhase === "round_result" && roundResultSecondsLeft !== null && (
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] sm:gap-2.5 sm:px-3 sm:py-1.5 sm:text-xs">
              <span className="inline-flex items-center gap-1">
                <span className="max-w-[4rem] truncate text-muted-foreground sm:max-w-[5.5rem]">
                  {localDisplayName}
                </span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    localWasCorrect
                      ? "text-emerald-400"
                      : localAnswer?.answer
                        ? "text-destructive"
                        : "text-foreground"
                  )}
                >
                  +{localLastPoints}
                </span>
              </span>
              <span className="text-muted-foreground" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="max-w-[4rem] truncate text-muted-foreground sm:max-w-[5.5rem]">
                  {opponentDisplayName}
                </span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    opponentWasCorrect
                      ? "text-emerald-400"
                      : opponentAnswer?.answer
                        ? "text-destructive"
                        : "text-foreground"
                  )}
                >
                  +{opponentLastPoints}
                </span>
              </span>
              <span className="hidden h-4 w-px bg-border/60 sm:inline" aria-hidden />
              <span className="inline-flex items-center gap-1">
                <span className="hidden text-muted-foreground sm:inline">Next</span>
                <Badge
                  variant={
                    roundResultSecondsLeft <= 3 ? "destructive" : "default"
                  }
                  className="min-w-[3.25rem] justify-center px-2 py-0.5 font-mono text-xs font-bold tabular-nums sm:min-w-[3.75rem] sm:text-sm"
                >
                  {roundResultSecondsLeft.toFixed(1)}s
                </Badge>
              </span>
            </div>
          )}
          <SoundVolumeControl collapsible />
          {isBotMatch && (
            <Badge variant="secondary">
              {botDifficulty ? BOT_DIFFICULTY_LABELS[botDifficulty] : "Bot"}
            </Badge>
          )}
          {roundPhase !== "round_result" && (
            <Badge
              variant={timeRemaining <= 5 ? "destructive" : "outline"}
              className="min-w-14 justify-center font-mono tabular-nums"
            >
              {timeRemaining}s
            </Badge>
          )}
        </div>
      </header>

      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col",
          roundPhase === "round_result"
            ? "overflow-hidden"
            : "overflow-y-auto touch-scroll"
        )}
      >
      <div
        className={cn(
          "relative flex w-full flex-1 flex-col items-center px-3 py-3 sm:px-6",
          roundPhase === "round_result"
            ? "min-h-0 justify-center py-4 sm:py-6"
            : "justify-center py-4 sm:py-6"
        )}
      >
        {roundPhase === "topic_reveal" && currentQuestion && (
          <div className="animate-in fade-in zoom-in flex min-h-[180px] w-full max-w-xl items-center justify-center rounded-2xl border border-primary/25 bg-muted/40 p-6 text-center duration-300 sm:min-h-[280px] sm:p-12">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary sm:text-sm sm:tracking-[0.35em]">
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
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Badge variant="secondary" className="uppercase tracking-wide">
                    {formatCategoryLabel(currentQuestion.category)}
                  </Badge>
                  <ReportQuestionButton
                    questionId={currentQuestion.id}
                    questionText={currentQuestion.question_text}
                  />
                </div>
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
                        "touch-target min-h-12 rounded-2xl border px-3 py-3 text-left text-sm transition-all active:scale-[0.99] sm:px-4 sm:py-4 sm:text-base",
                        "border-border/60 bg-card/60 hover:border-primary/30 hover:bg-primary/5",
                        "disabled:cursor-not-allowed",
                        isSelected &&
                          "border-primary bg-primary/10 ring-2 ring-primary/20"
                      )}
                    >
                      <span className="flex items-start gap-2">
                        <span
                          className={cn(
                            "font-semibold",
                            isSelected ? "text-primary" : "text-primary"
                          )}
                        >
                          {key}.
                        </span>
                        <span className="flex-1">{text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {showWaiting && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Waiting for {opponentDisplayName}...
                </div>
              )}

              {isLocked && opponentAnswer && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Revealing answers...
                </div>
              )}
            </div>
          )}

        {roundPhase === "round_result" && currentQuestion && (
          <div className="flex w-full max-w-2xl shrink-0 flex-col gap-3 sm:gap-4">
            <div className="flex shrink-0 items-start justify-between gap-3 sm:gap-4">
              <p className="line-clamp-2 flex-1 text-left text-base font-medium leading-snug sm:text-lg">
                {currentQuestion.question_text}
              </p>
              <ReportQuestionButton
                questionId={currentQuestion.id}
                questionText={currentQuestion.question_text}
                showLabel
                className="shrink-0"
              />
            </div>

            <div
              className={cn(
                "flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold sm:py-3",
                localWasCorrect
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : localAnswer?.answer
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-border/60 bg-muted/30 text-muted-foreground"
              )}
            >
              {localWasCorrect ? (
                <>
                  <CheckCircle2 className="size-5 shrink-0" />
                  Correct!
                </>
              ) : localAnswer?.answer ? (
                <>
                  <XCircle className="size-5 shrink-0" />
                  Wrong answer
                </>
              ) : (
                <>Timed out</>
              )}
            </div>

            <div className="grid w-full shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              {OPTIONS.map(({ key, label }) => {
                const text = currentQuestion[label as keyof typeof currentQuestion] as string;
                const isLocalPick = localAnswer?.answer === key;
                const isOpponentPick = opponentAnswer?.answer === key;
                const isCorrectOption = key === currentQuestion.correct_answer;
                const showLocalWrong = isLocalPick && localWasCorrect === false;
                const showLocalCorrect = isLocalPick && localWasCorrect === true;
                const showOpponentWrong =
                  isOpponentPick && opponentWasCorrect === false;
                const showOpponentCorrect =
                  isOpponentPick && opponentWasCorrect === true;
                const showCorrectReveal =
                  isCorrectOption &&
                  !showLocalCorrect &&
                  !showOpponentCorrect;
                const isHighlighted =
                  showLocalWrong ||
                  showLocalCorrect ||
                  showOpponentWrong ||
                  showOpponentCorrect ||
                  showCorrectReveal;

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex min-h-[3.25rem] flex-col justify-center rounded-2xl border px-3 py-3 text-left text-sm sm:min-h-14 sm:px-4 sm:py-3.5 sm:text-base",
                      !isHighlighted && "opacity-70",
                      showLocalWrong &&
                        "border-destructive bg-destructive/15 opacity-100",
                      showLocalCorrect &&
                        "border-emerald-500 bg-emerald-500/15 opacity-100",
                      !showLocalWrong &&
                        !showLocalCorrect &&
                        showOpponentWrong &&
                        "border-destructive/70 bg-destructive/10 opacity-100",
                      !showLocalWrong &&
                        !showLocalCorrect &&
                        showOpponentCorrect &&
                        "border-emerald-500/70 bg-emerald-500/10 opacity-100",
                      showCorrectReveal &&
                        "border-emerald-500/50 bg-emerald-500/10 opacity-100",
                      !isHighlighted &&
                        "border-border/60 bg-card/60"
                    )}
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3">
                      <span
                        className={cn(
                          "shrink-0 font-semibold",
                          (showLocalWrong || showOpponentWrong) &&
                            "text-destructive",
                          (showLocalCorrect ||
                            showOpponentCorrect ||
                            showCorrectReveal) &&
                            "text-emerald-400",
                          !isHighlighted && "text-muted-foreground"
                        )}
                      >
                        {key}.
                      </span>
                      <span className="min-w-0 flex-1 leading-snug sm:line-clamp-2">
                        {text}
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {isLocalPick && (
                          <Badge variant="secondary" className="h-5 px-2 text-[10px] sm:text-xs">
                            You
                          </Badge>
                        )}
                        {isOpponentPick && (
                          <Badge variant="outline" className="h-5 max-w-[5.5rem] truncate px-2 text-[10px] sm:max-w-[6.5rem] sm:text-xs">
                            {opponentDisplayName}
                          </Badge>
                        )}
                        {showLocalWrong && (
                          <XCircle className="size-4 text-destructive sm:size-5" />
                        )}
                        {showLocalCorrect && (
                          <CheckCircle2 className="size-4 text-emerald-400 sm:size-5" />
                        )}
                        {!isLocalPick && showOpponentCorrect && (
                          <CheckCircle2 className="size-4 text-emerald-400/80 sm:size-5" />
                        )}
                        {!isLocalPick && showOpponentWrong && (
                          <XCircle className="size-4 text-destructive/80 sm:size-5" />
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full shrink-0 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-center sm:py-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground sm:text-sm">
                Correct answer
              </p>
              <p className="mt-1.5 text-base leading-snug sm:mt-2 sm:text-lg">
                <span className="font-bold text-emerald-400">
                  {currentQuestion.correct_answer}.
                </span>{" "}
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
        <span className="hidden text-border md:inline">|</span>
        <span className="hidden font-mono text-muted-foreground/60 md:inline">
          {MATCH_SYNC_VERSION}·{sessionId.slice(0, 8)}
        </span>
      </footer>
      </div>
    </main>
  );
}
