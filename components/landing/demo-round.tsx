"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DemoQuestion } from "@/lib/landing-demo-questions";
import { computePoints } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** Seconds to read the page before the first question starts. */
const INTRO_SECONDS = 3;
/** Answer window per question. */
const ROUND_SECONDS = 15;
/** How long the answer stays on screen before the next question. */
const REVEAL_MS = 2_800;

const LETTERS = ["A", "B", "C", "D"];
/** What the opponent scores each round — the visitor plays for real against this. */
const OPPONENT_POINTS = [130, 0, 120];

/* Red/green use literal palette colours, not the destructive/primary tokens: those are CSS
   variables, and Tailwind's opacity shortcuts (bg-destructive/10) paint nothing on them. */
const CORRECT_ROW = "border-emerald-500/40 bg-emerald-500/10";
const WRONG_ROW = "border-red-500/50 bg-red-500/10";
const CORRECT_TEXT = "text-emerald-600 dark:text-emerald-400";
const WRONG_TEXT = "text-red-600 dark:text-red-400";

type Phase = "intro" | "playing" | "revealed" | "invite";

type DemoRoundProps = {
  /** Three questions picked on the server — a new set on every page load. */
  questions: DemoQuestion[];
  /** Opponent name, also picked per request. */
  opponent: string;
  className?: string;
};

/** Playable sample round in the live match's styling: answer three questions, then sign up. */
export function DemoRound({ questions, opponent, className }: DemoRoundProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [introLeft, setIntroLeft] = useState(INTRO_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [picked, setPicked] = useState<number | null>(null);
  const [scores, setScores] = useState({ you: 0, opponent: 0 });
  const askedAt = useRef(0);

  const question = questions[index];
  const revealed = phase === "revealed" || phase === "invite";
  const answeredRight = picked !== null && picked === question.correct;
  const isLast = index === questions.length - 1;

  const reveal = useCallback(
    (choice: number | null) => {
      const right = choice !== null && choice === question.correct;
      const points = computePoints(right, right ? Date.now() - askedAt.current : null);
      setPicked(choice);
      setScores((s) => ({
        you: s.you + points,
        opponent: s.opponent + (OPPONENT_POINTS[index] ?? 0),
      }));
      setPhase("revealed");
    },
    [index, question.correct]
  );

  // Short countdown, then the first question
  useEffect(() => {
    if (phase !== "intro") {
      return;
    }
    const tick = window.setTimeout(() => {
      if (introLeft > 1) {
        setIntroLeft(introLeft - 1);
      } else {
        askedAt.current = Date.now();
        setSecondsLeft(ROUND_SECONDS);
        setPhase("playing");
      }
    }, 1000);
    return () => window.clearTimeout(tick);
  }, [phase, introLeft]);

  // Round clock — running out reveals the correct answer
  useEffect(() => {
    if (phase !== "playing") {
      return;
    }
    if (secondsLeft <= 0) {
      reveal(null);
      return;
    }
    const tick = window.setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => window.clearTimeout(tick);
  }, [phase, secondsLeft, reveal]);

  // Hold the answer, then next question or the sign-up invite
  useEffect(() => {
    if (phase !== "revealed") {
      return;
    }
    const next = window.setTimeout(() => {
      if (isLast) {
        setPhase("invite");
        return;
      }
      setIndex((i) => i + 1);
      setPicked(null);
      setSecondsLeft(ROUND_SECONDS);
      askedAt.current = Date.now();
      setPhase("playing");
    }, REVEAL_MS);
    return () => window.clearTimeout(next);
  }, [phase, isLast]);

  return (
    <section
      className={cn("glass-panel relative overflow-hidden", className)}
      aria-label="Try a round: three sample questions"
    >
      <header className="flex flex-wrap items-start justify-between gap-x-2 gap-y-2 border-b border-border/60 px-4 py-3 sm:items-center sm:px-5 sm:py-4">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {phase === "intro"
              ? `Match starts in ${introLeft}s`
              : `Question ${index + 1}/${questions.length}`}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium">
            <span className="truncate">You · {scores.you}</span>
            <span className="text-muted-foreground">vs</span>
            <span className="truncate">
              {opponent} · {scores.opponent}
            </span>
          </div>
        </div>

        {phase === "playing" && (
          <Badge
            variant={secondsLeft <= 5 ? "destructive" : "outline"}
            className="ml-auto min-w-14 shrink-0 justify-center font-mono tabular-nums"
          >
            {secondsLeft}s
          </Badge>
        )}
      </header>

      <div className="px-4 py-5 sm:px-5 sm:py-6">
        {phase === "intro" ? (
          <div className="animate-in fade-in zoom-in flex min-h-[180px] items-center justify-center rounded-2xl border border-primary/25 bg-muted/40 p-6 text-center duration-300">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Up next</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight">
                {question.category.toUpperCase()}
              </h3>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in space-y-4 duration-300 sm:space-y-5">
            {revealed && (
              <div
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold",
                  answeredRight
                    ? `${CORRECT_ROW} ${CORRECT_TEXT}`
                    : picked !== null
                      ? `${WRONG_ROW} ${WRONG_TEXT}`
                      : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
              >
                {answeredRight ? (
                  <>
                    <CheckCircle2 className="size-5 shrink-0" />
                    Correct!
                  </>
                ) : picked !== null ? (
                  <>
                    <XCircle className="size-5 shrink-0" />
                    Wrong answer
                  </>
                ) : (
                  <>Timed out</>
                )}
              </div>
            )}

            <div className="space-y-2 text-center">
              <Badge variant="secondary" className="uppercase tracking-wide">
                {question.category}
              </Badge>
              <h3 className="text-lg font-semibold leading-snug sm:text-xl" lang="it">
                {question.prompt}
              </h3>
              <p className="text-sm text-muted-foreground">{question.hint}</p>
            </div>

            <div className="grid gap-2.5">
              {question.options.map((text, i) => {
                const isPicked = revealed && i === picked;
                const isCorrect = revealed && i === question.correct;
                const isWrong = isPicked && !isCorrect;

                return (
                  <button
                    key={text}
                    type="button"
                    disabled={phase !== "playing"}
                    onClick={() => reveal(i)}
                    className={cn(
                      "touch-target flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-all active:scale-[0.99] sm:px-4 sm:text-base",
                      "border-border/60 bg-card/60 disabled:cursor-default",
                      phase === "playing" && "hover:border-primary/30 hover:bg-primary/5",
                      isCorrect && CORRECT_ROW,
                      isWrong && WRONG_ROW
                    )}
                  >
                    <span className={cn("font-semibold", isWrong ? WRONG_TEXT : "text-primary")}>
                      {LETTERS[i]}.
                    </span>
                    <span className="flex-1" lang={question.optionsLang}>
                      {text}
                    </span>
                    {isCorrect && (
                      <CheckCircle2
                        className={cn("size-4 shrink-0", CORRECT_TEXT)}
                        aria-label="Correct answer"
                      />
                    )}
                    {isWrong && (
                      <XCircle
                        className={cn("size-4 shrink-0", WRONG_TEXT)}
                        aria-label="Your answer, wrong"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Overlay backgrounds use color-mix, not Tailwind opacity shortcuts: these tokens are
          CSS variables, so the shortcut paints no background at all. */}
      <div aria-live="polite">
        {phase === "invite" && (
          <div
            className="animate-in fade-in absolute inset-0 z-10 flex items-end justify-center p-4 backdrop-blur-sm duration-300 sm:p-5"
            style={{ background: "color-mix(in srgb, var(--background) 82%, transparent)" }}
          >
            <div
              className="animate-in slide-in-from-bottom-4 w-full rounded-xl border border-border/60 p-5 shadow-sm duration-300"
              style={{ background: "var(--card)" }}
            >
              <p className="text-base font-semibold tracking-tight sm:text-lg">
                Want to improve your Italian?
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                A real match is ten questions against a live opponent at your level.
              </p>
              <Button asChild className="mt-4 h-11 w-full">
                <Link href="/login?mode=signup">Create account</Link>
              </Button>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
