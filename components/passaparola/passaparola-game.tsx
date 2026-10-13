"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Clock, Loader2, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  nextLetter,
  PASSAPAROLA_FINISH_WORD,
  PASSAPAROLA_LETTERS,
  PASSAPAROLA_PASS_WORD,
  playPassaparola,
  type PassaparolaMark,
  type PassaparolaTurnResult,
  type PassaparolaView,
} from "@/lib/passaparola";
import { createClient } from "@/utils/supabase/client";

type Move = Parameters<typeof playPassaparola>[2];
type Message = { text: string; tone: "right" | "wrong" };

const MARK_COLOR: Record<PassaparolaMark, string> = {
  right: "bg-emerald-600",
  wrong: "bg-red-600",
};

// Not bg-muted-foreground/50: that color is a bare CSS variable, so Tailwind 3 cannot make it see-through.
const UNANSWERED = "bg-zinc-500";

const TONE: Record<Message["tone"], string> = {
  right: "text-emerald-600 dark:text-emerald-400",
  wrong: "text-red-600 dark:text-red-400",
};

function clock(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function lettersOf(view: PassaparolaView) {
  return view.clues.map((clue) => clue.letter);
}

// Input does not forward refs (React 18), so the field is found through its form.
function focusAnswer(form: HTMLFormElement | null) {
  (form?.elements.namedItem("answer") as HTMLInputElement | null)?.focus();
}

function Keyword({ word, className }: { word: string; className: string }) {
  return <span className={cn("font-mono font-semibold", className)}>{word}</span>;
}

export function PassaparolaGame({
  initialLevel,
  initial,
}: {
  initialLevel: string;
  initial: PassaparolaTurnResult;
}) {
  const [supabase] = useState(createClient);
  const [level, setLevel] = useState(initialLevel);
  const [view, setView] = useState<PassaparolaView | null>(initial.ok ? initial.view : null);
  const [current, setCurrent] = useState(() =>
    initial.ok ? nextLetter(lettersOf(initial.view), initial.view.marks, null) : null
  );
  // shortcut: passes live in this tab only, so a reload mid-game forgets them
  // and plays from A again; store them with the game if players complain.
  const [passed, setPassed] = useState<ReadonlySet<string>>(() => new Set());
  const [msLeft, setMsLeft] = useState(initial.ok ? initial.view.msLeft : 300_000);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<Message | null>(
    initial.ok ? null : { text: initial.error, tone: "wrong" }
  );
  const [pending, setPending] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const playing = Boolean(view?.started && !view.finished);

  /** Sends one move; the next letter is the first one still to play after `after`. */
  async function send(nextLevel: string, move: Move, after: string | null) {
    setPending(true);
    const result = await playPassaparola(supabase, nextLevel, move);
    setPending(false);
    if (!result.ok) {
      setMessage({ text: result.error, tone: "wrong" });
      return result;
    }
    setView(result.view);
    setLevel(result.view.level);
    setMsLeft(result.view.msLeft);
    setCurrent(nextLetter(lettersOf(result.view), result.view.marks, after));
    setMessage(null);
    return result;
  }

  // Counts down from the server's figure. At zero the server has ended the
  // game too, so one more load brings the answers.
  useEffect(() => {
    if (!view?.started || view.finished) {
      return;
    }
    const end = Date.now() + view.msLeft;
    const timer = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      setMsLeft(left);
      if (left === 0) {
        clearInterval(timer);
        void playPassaparola(supabase, view.level, { date: view.date }).then((result) => {
          if (result.ok) {
            setView(result.view);
            setMsLeft(result.view.msLeft);
          } else {
            setMessage({ text: result.error, tone: "wrong" });
          }
        });
      }
    }, 250);
    return () => clearInterval(timer);
  }, [supabase, view]);

  async function begin() {
    setPassed(new Set());
    for (const second of [3, 2, 1]) {
      setCountdown(second);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    // The clock starts only now, so the countdown costs no playing time.
    await send(level, { start: true }, null);
    setCountdown(null);
  }

  function pass(form: HTMLFormElement | null) {
    const letter = current;
    if (!view || !letter) {
      return;
    }
    setPassed((letters) => new Set(letters).add(letter));
    setCurrent(nextLetter(lettersOf(view), view.marks, letter));
    setInput("");
    setMessage(null);
    focusAnswer(form);
  }

  async function answer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const typed = input.trim();
    const letter = current;
    if (!view || !letter || pending || !typed) {
      return;
    }
    if (typed.toLowerCase() === PASSAPAROLA_PASS_WORD) {
      pass(form);
      return;
    }
    if (typed.toLowerCase() === PASSAPAROLA_FINISH_WORD) {
      if ((await send(view.level, { date: view.date, finish: true }, null)).ok) {
        setInput("");
      }
      return;
    }
    const result = await send(view.level, { date: view.date, letter, answer: typed }, letter);
    if (result.ok) {
      setInput("");
      const mark = result.view.marks[letter];
      if (mark) {
        setMessage(
          mark === "right"
            ? { text: `${letter}: correct!`, tone: "right" }
            : { text: `${letter}: wrong. You will see the answer at the end.`, tone: "wrong" }
        );
      }
    }
    focusAnswer(form);
  }

  const letters = view?.started ? lettersOf(view) : PASSAPAROLA_LETTERS;
  const right = letters.filter((letter) => view?.marks[letter] === "right").length;
  const wrong = letters.filter((letter) => view?.marks[letter] === "wrong").length;
  // Once the game is over, every letter left unanswered counts as passed.
  const skipped = view?.finished
    ? letters.length - right - wrong
    : [...passed].filter((letter) => !view?.marks[letter]).length;
  const clue = view?.clues.find((item) => item.letter === current)?.clue;

  const skippedLabel = view?.finished ? "Not answered" : "Passed";
  const counts = (
    <p className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-1">
        <Check className="size-4 text-emerald-600" aria-hidden />
        <b className="text-emerald-600 dark:text-emerald-400">{right}</b> Correct
      </span>
      <span className="flex items-center gap-1">
        <X className="size-4 text-red-600" aria-hidden />
        <b className="text-red-600 dark:text-red-400">{wrong}</b> Wrong
      </span>
      <span className="flex items-center gap-1">
        <SkipForward className="size-4 text-amber-500" aria-hidden />
        <b className="text-amber-600 dark:text-amber-400">{skipped}</b> {skippedLabel}
      </span>
    </p>
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      {/* Same title and level chips as the Wordle page. */}
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Passaparola</h1>
        <p className="text-sm text-muted-foreground">
          A clue for every letter from A to Z in 5 minutes. One board a day for each level.
        </p>
      </header>
      <div className="-mx-1 -mt-3 flex gap-2 overflow-x-auto px-1 pb-1 touch-scroll" role="group" aria-label="Level">
          {PROFICIENCY_LEVELS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === level}
              disabled={pending || playing || countdown !== null}
              onClick={() => {
                setPassed(new Set());
                void send(option, {}, null);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                option === level
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-transparent text-foreground hover:bg-muted"
              )}
            >
              {option}
            </button>
          ))}
      </div>

      {/*
        Wide screens: wheel left, play area right; once the game is over, score
        and wheel left, every answer right. The wheel never grows taller than the
        screen allows.
      */}
      <div
        className={cn(
          "flex flex-col gap-6 md:flex-1 md:flex-row md:gap-10",
          view?.finished ? "md:items-start" : "md:items-center"
        )}
      >
        <div className="mx-auto flex w-full max-w-[20rem] shrink-0 flex-col gap-4 md:mx-0 md:w-[min(50%,calc(100dvh_-_12rem))] md:max-w-md">
          {view?.finished && (
            <div className="glass-panel space-y-2 p-4 text-center">
              <p className="text-lg font-semibold">
                {right === letters.length ? "Perfetto! Every letter right." : `${right} of ${letters.length} right.`}
              </p>
              <p className="text-xs text-muted-foreground">A new board comes tomorrow. Try another level above.</p>
              {counts}
            </div>
          )}

          <div
            role="img"
            aria-label={`${right} correct, ${wrong} wrong, ${skipped} ${skippedLabel.toLowerCase()}`}
            className="relative aspect-square w-full"
          >
            {letters.map((letter, index) => {
              const angle = (index / letters.length) * 2 * Math.PI - Math.PI / 2;
              const mark = view?.marks[letter];
              return (
                <span
                  key={letter}
                  aria-hidden
                  // Rounded so the server and the browser print the same style.
                  style={{
                    left: `${(50 + 44 * Math.cos(angle)).toFixed(2)}%`,
                    top: `${(50 + 44 * Math.sin(angle)).toFixed(2)}%`,
                  }}
                  className={cn(
                    "absolute flex size-[11%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition-transform md:text-base",
                    mark
                      ? MARK_COLOR[mark]
                      : view?.finished
                        ? UNANSWERED
                        : passed.has(letter)
                          ? "bg-amber-400 text-black"
                          : "bg-sky-600",
                    playing && letter === current && "z-10 scale-125 ring-[3px] ring-foreground ring-offset-2 ring-offset-background"
                  )}
                >
                  {letter}
                </span>
              );
            })}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <span
                className={cn(
                  "flex items-center gap-2 text-3xl font-bold tabular-nums md:text-4xl",
                  playing && msLeft <= 30_000 && "text-red-600"
                )}
              >
                <Clock className="size-6 text-muted-foreground" aria-hidden />
                <span role="timer">{clock(msLeft)}</span>
              </span>
              {playing && current && (
                <span className="text-sm font-medium text-muted-foreground">
                  Starts with {current}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          {view && !view.started && (
            <div className="glass-panel space-y-4 p-5 text-center">
              <ul className="space-y-1.5 text-left text-sm">
                <li>Type the Italian word and press Enter.</li>
                <li>
                  Type <Keyword word={PASSAPAROLA_PASS_WORD} className="text-amber-500" /> or press Passo
                  to skip a letter; it comes back once the others are done.
                </li>
                <li>
                  Type <Keyword word={PASSAPAROLA_FINISH_WORD} className="text-red-500" /> to finish early.
                </li>
                <li>A wrong answer turns red; you see the right answers at the end.</li>
              </ul>
              <Button type="button" size="lg" disabled={pending || countdown !== null} onClick={() => void begin()}>
                Start
              </Button>
            </div>
          )}

          {playing && current && (
            <>
              <p className="flex min-h-24 items-center justify-center text-balance text-center text-2xl font-extrabold uppercase leading-tight tracking-tight md:text-3xl">
                {clue}
              </p>

              <form
                onSubmit={answer}
                className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 p-1.5 pl-4 focus-within:ring-2 focus-within:ring-ring/50"
              >
                <Input
                  name="answer"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  lang="it"
                  aria-label={`Italian word starting with ${current}`}
                  placeholder={`${current}… (type the answer)`}
                  value={input}
                  // Read-only, not disabled, while checking: a disabled field loses focus.
                  readOnly={pending}
                  onChange={(event) => setInput(event.target.value)}
                  className="h-11 flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:h-11 md:text-base dark:bg-transparent"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={(event) => pass(event.currentTarget.form)}
                  className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-4 text-sm font-bold uppercase tracking-wide text-black transition-colors hover:bg-amber-300 disabled:opacity-60"
                >
                  <ChevronRight className="size-4" aria-hidden />
                  Passo
                </button>
              </form>
            </>
          )}

          {view?.finished && (
            <ul className="space-y-1.5" aria-label="Answers">
              {view.clues.map((item) => {
                const mark = view.marks[item.letter];
                const given = view.given[item.letter];
                return (
                  <li
                    key={item.letter}
                    className="flex items-start gap-3 rounded-lg border border-border px-3 py-1.5 text-sm"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                        mark ? MARK_COLOR[mark] : UNANSWERED
                      )}
                    >
                      {item.letter}
                    </span>
                    <span className="min-w-0">
                      <span className="block">
                        <span className="sr-only">{item.letter}: </span>
                        <span className="font-semibold">{view.answers?.[item.letter]?.join(" / ")}</span>
                        <span className="text-muted-foreground"> · {item.clue}</span>
                      </span>
                      {mark ? (
                        <span className={cn("flex items-center gap-1 text-xs", TONE[mark])}>
                          {mark === "right" ? (
                            <Check className="size-3.5 shrink-0" aria-hidden />
                          ) : (
                            <X className="size-3.5 shrink-0" aria-hidden />
                          )}
                          {given ? (
                            <span className="min-w-0 truncate">
                              You: <span className="font-medium">{given}</span>
                            </span>
                          ) : mark === "right" ? (
                            "Right"
                          ) : (
                            "Wrong"
                          )}
                          {given && <span className="sr-only">({mark})</span>}
                        </span>
                      ) : (
                        <span className="block text-xs text-muted-foreground">Not answered</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p
            role="status"
            aria-live="polite"
            className={cn("min-h-5 text-center text-sm font-medium", message && TONE[message.tone])}
          >
            {message?.text}
          </p>

          {playing && counts}
        </div>
      </div>

      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm space-y-4 p-6 text-center" role="status" aria-live="assertive">
            <p className="text-6xl font-extrabold tabular-nums">{countdown}</p>
            <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" aria-hidden />
            <ul className="space-y-1 text-left text-sm">
              <li>
                Stuck? Type <Keyword word={PASSAPAROLA_PASS_WORD} className="text-amber-500" /> to pass.
              </li>
              <li>
                Done? Type <Keyword word={PASSAPAROLA_FINISH_WORD} className="text-red-500" /> to finish early.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
