"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DemoQuestion } from "@/lib/landing-demo-questions";
import { ROUND_DURATION_SEC } from "@/lib/match-timing";
import { computePoints } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Turn = { right: boolean; responseMs: number; opponentPoints: number };

/** Scripted turns: right, wrong (correct answer shown), right. Ends 280–250. */
const TURNS: Turn[] = [
  { right: true, responseMs: 3_200, opponentPoints: 130 },
  { right: false, responseMs: 6_800, opponentPoints: 120 },
  { right: true, responseMs: 4_100, opponentPoints: 0 },
];

/** Seconds to read the page before the first question starts, counted down in the card. */
const INTRO_SECONDS = 5;

/** Each question shows for 2s before its answer; each answer stays 2s before moving on. */
const QUESTION_MS = 2_000;
const ANSWER_MS = 2_000;

const LETTERS = ["A", "B", "C", "D"];

type Phase = "intro" | "question" | "answer" | "invite";
type Frame = { index: number; phase: Phase };

function isRevealed(phase: Phase) {
  return phase === "answer" || phase === "invite";
}

function nextFrame({ index, phase }: Frame, total: number): Frame | null {
  if (phase === "question") {
    return { index, phase: "answer" };
  }
  if (phase === "answer") {
    return index < total - 1
      ? { index: index + 1, phase: "question" }
      : { index, phase: "invite" };
  }
  return null;
}

function pointsFor(turn: Turn) {
  return computePoints(turn.right, turn.responseMs);
}

function scoresAt({ index, phase }: Frame, total: number) {
  let you = 0;
  let opponent = 0;

  TURNS.slice(0, total).forEach((turn, i) => {
    if (i < index || (i === index && isRevealed(phase))) {
      you += pointsFor(turn);
      opponent += turn.opponentPoints;
    }
  });

  return { you, opponent };
}

type DemoRoundProps = {
  /** Three questions picked on the server — a new set on every page load. */
  questions: DemoQuestion[];
};

/** Sample match: waits 5s so the page can be read, plays once, then invites sign-up. */
export function DemoRound({ questions }: DemoRoundProps) {
  const [frame, setFrame] = useState<Frame>({ index: 0, phase: "intro" });
  const [secondsLeft, setSecondsLeft] = useState(INTRO_SECONDS);
  const question = questions[frame.index];
  const turn = TURNS[frame.index];
  const intro = frame.phase === "intro";
  const { you, opponent } = scoresAt(frame, questions.length);
  const timerStyle = {
    "--timer-end": intro ? 1 : 1 - turn.responseMs / (ROUND_DURATION_SEC * 1000),
    "--question-ms": `${QUESTION_MS}ms`,
  } as CSSProperties;

  useEffect(() => {
    if (frame.phase === "intro") {
      const tick = window.setTimeout(() => {
        if (secondsLeft > 1) {
          setSecondsLeft(secondsLeft - 1);
        } else {
          setFrame({ index: 0, phase: "question" });
        }
      }, 1000);
      return () => window.clearTimeout(tick);
    }

    const next = nextFrame(frame, questions.length);
    if (!next) {
      return;
    }

    const timer = window.setTimeout(
      () => setFrame(next),
      frame.phase === "question" ? QUESTION_MS : ANSWER_MS
    );
    return () => window.clearTimeout(timer);
  }, [frame, secondsLeft, questions.length]);

  return (
    <figure
      aria-label="Example match: three questions against Marco"
      className="landing-round relative w-full max-w-md justify-self-center overflow-hidden lg:justify-self-end"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium tabular-nums">
          {intro
            ? `Match starts in ${secondsLeft}s`
            : `Question ${frame.index + 1}/${questions.length}`}
        </span>
        <span className="landing-round-chip">{question.category}</span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <p className="flex flex-col">
          <span className="text-sm text-white/85">You</span>
          <span key={you} className="landing-display landing-round-score">
            {you}
          </span>
        </p>
        <p className="flex flex-col items-end">
          <span className="text-sm text-white/85">Marco</span>
          <span key={opponent} className="landing-display landing-round-score">
            {opponent}
          </span>
        </p>
      </div>

      <div className="landing-round-track mt-4" aria-hidden>
        {/* Remounts when the clock starts, so each question's drain animation replays */}
        <div
          key={intro ? "intro" : frame.index}
          className="landing-round-timer"
          style={timerStyle}
        />
      </div>

      {/* Stacked in one grid cell so the card keeps the tallest question's height */}
      <div className="mt-6 grid">
        {questions.map((item, i) => (
          <QuestionView
            key={item.id}
            question={item}
            turn={TURNS[i]}
            active={i === frame.index}
            revealed={i < frame.index || (i === frame.index && isRevealed(frame.phase))}
          />
        ))}
      </div>

      <div aria-live="polite">{frame.phase === "invite" && <SignUpInvite />}</div>
    </figure>
  );
}

function QuestionView({
  question,
  turn,
  active,
  revealed,
}: {
  question: DemoQuestion;
  turn: Turn;
  active: boolean;
  revealed: boolean;
}) {
  const [before, after] = question.prompt.split("___");
  const pickedIndex = turn.right ? question.correct : question.trap;

  return (
    <div
      aria-hidden={!active}
      className={cn(
        "landing-round-question",
        active ? "landing-round-question--active" : "invisible"
      )}
    >
      <p className="text-xl font-semibold leading-snug sm:text-2xl" lang="it">
        {before}
        {after !== undefined && (
          <>
            <span className="landing-round-blank">
              {revealed ? (
                <span className="landing-round-fill">
                  {question.options[question.correct]}
                </span>
              ) : (
                <span className="sr-only">blank</span>
              )}
            </span>
            {after}
          </>
        )}
      </p>
      <p className="mt-1.5 text-sm text-white/85">{question.hint}</p>

      <ul className="mt-5 grid gap-2">
        {question.options.map((text, i) => {
          const picked = revealed && i === pickedIndex;
          const correct = revealed && i === question.correct;
          const wrong = picked && !correct;

          return (
            <li
              key={text}
              className={cn(
                "landing-round-option",
                correct && "landing-round-option--correct",
                wrong && "landing-round-option--wrong"
              )}
            >
              <span className="landing-display w-4 shrink-0 font-semibold">
                {LETTERS[i]}
              </span>
              <span lang={question.optionsLang}>{text}</span>
              {correct && (
                <span className="landing-round-gain">
                  <Check className="size-4" aria-hidden />
                  {picked ? (
                    <span className="landing-display">+{pointsFor(turn)}</span>
                  ) : (
                    <span className="sr-only">Correct answer</span>
                  )}
                </span>
              )}
              {wrong && (
                <span className="landing-round-gain">
                  <X className="size-4" aria-hidden />
                  <span className="landing-display">+0</span>
                  <span className="sr-only">Wrong answer</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SignUpInvite() {
  return (
    <>
      <div className="landing-invite-scrim" aria-hidden />
      <div className="landing-invite">
        <p className="landing-display text-2xl font-semibold leading-tight">
          Want to improve your Italian?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#4a5775]">
          A real match is ten questions against a live opponent at your level.
        </p>
        <Button asChild size="lg" className="mt-5 h-12 w-full text-base">
          <Link href="/login?mode=signup">Create account</Link>
        </Button>
        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#0b5fbf] underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
