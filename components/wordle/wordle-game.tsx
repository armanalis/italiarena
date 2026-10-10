"use client";

import { useCallback, useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROFICIENCY_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  keyboardMarks,
  playWordle,
  WORDLE_LENGTH,
  WORDLE_MAX_GUESSES,
  type WordleArchiveDay,
  type WordleMark,
  type WordleStatus,
  type WordleTurnResult,
  type WordleView,
} from "@/lib/wordle";
import { createClient } from "@/utils/supabase/client";

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TILE: Record<WordleMark, string> = {
  correct: "border-emerald-600 bg-emerald-600 text-white",
  present: "border-amber-500 bg-amber-500 text-white",
  absent: "border-transparent bg-muted text-muted-foreground",
};

const MARK_WORDS: Record<WordleMark, string> = {
  correct: "right place",
  present: "wrong place",
  absent: "not in the word",
};

function formatDay(date: string) {
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

function statusLabel(status: WordleStatus | null) {
  if (status === "won") return "Solved";
  if (status === "lost") return "Missed";
  if (status === "playing") return "In progress";
  return "Play";
}

export function WordleGame({
  initialLevel,
  initial,
}: {
  initialLevel: string;
  initial: WordleTurnResult;
}) {
  const [supabase] = useState(createClient);
  const [level, setLevel] = useState(initialLevel);
  const [today, setToday] = useState(initial.ok ? initial.today : null);
  const [view, setView] = useState<WordleView | null>(initial.ok ? initial.view : null);
  const [archive, setArchive] = useState<WordleArchiveDay[]>(initial.ok ? initial.archive ?? [] : []);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(initial.ok ? null : initial.error);
  // A guess or a level/day switch on its way to the database.
  const [pending, setPending] = useState(false);

  const playing = view?.status === "playing";

  async function open(nextLevel: string, date: string | null) {
    const day = date ?? today;
    if (!day || pending) {
      return;
    }
    setPending(true);
    const next = await playWordle(supabase, nextLevel, day, null);
    setPending(false);
    setLevel(nextLevel);
    setInput("");
    if (next.ok) {
      setToday(next.today);
      setView(next.view);
      setArchive(next.archive ?? []);
      setMessage(null);
    } else {
      setMessage(next.error);
    }
  }

  const submit = useCallback(async () => {
    if (!view) {
      return;
    }
    setPending(true);
    const next = await playWordle(supabase, view.level, view.date, input);
    setPending(false);
    if (!next.ok) {
      setMessage(next.error);
      return;
    }
    setInput("");
    setMessage(null);
    setView(next.view);
    // The archive only changes for this day, and only its status.
    setArchive((days) =>
      days.map((day) => (day.date === next.view.date ? { ...day, status: next.view.status } : day))
    );
  }, [input, supabase, view]);

  const press = useCallback(
    (key: string) => {
      if (!view || !playing || pending) {
        return;
      }
      if (key === "Enter") {
        if (input.length < WORDLE_LENGTH) {
          setMessage(`Type a ${WORDLE_LENGTH}-letter word.`);
          return;
        }
        void submit();
        return;
      }
      if (key === "Backspace") {
        setInput((current) => current.slice(0, -1));
        return;
      }
      if (/^[a-z]$/i.test(key) && input.length < WORDLE_LENGTH) {
        setInput((current) => current + key.toLowerCase());
        setMessage(null);
      }
    },
    [input, pending, playing, submit, view]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) {
        return;
      }
      if (event.key === "Enter" || event.key === "Backspace" || /^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        press(event.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [press]);

  const keys = keyboardMarks(view?.guesses ?? []);
  const rows = Array.from({ length: WORDLE_MAX_GUESSES }, (_, index) => {
    const guess = view?.guesses[index];
    if (guess) {
      return { letters: [...guess.word], marks: guess.marks as (WordleMark | null)[], checking: false };
    }
    const current = playing && index === (view?.guesses.length ?? 0);
    return {
      letters: Array.from({ length: WORDLE_LENGTH }, (_, letter) => (current ? input[letter] ?? "" : "")),
      marks: Array.from({ length: WORDLE_LENGTH }, () => null as WordleMark | null),
      checking: current && pending,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Wordle</h1>
        <p className="text-sm text-muted-foreground">
          Guess the 5-letter Italian word in {WORDLE_MAX_GUESSES} tries. One puzzle a day for each level.
        </p>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 touch-scroll" role="group" aria-label="Level">
        {PROFICIENCY_LEVELS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === level}
            disabled={pending}
            onClick={() => void open(option, null)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              option === level
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-foreground hover:bg-muted"
            )}
          >
            {option}
          </button>
        ))}
      </div>

      {view && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium">
            #{view.number} · {view.level} · {view.isToday ? "Today" : formatDay(view.date)}
          </span>
          {!view.isToday && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void open(level, null)}>
              Back to today
            </Button>
          )}
        </div>
      )}

      <div className="mx-auto grid gap-1.5" aria-label="Board">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-5 gap-1.5"
            role="group"
            aria-label={
              view?.guesses[rowIndex]
                ? `Guess ${rowIndex + 1}: ${row.letters
                    .map((letter, index) => `${letter.toUpperCase()} ${MARK_WORDS[row.marks[index]!]}`)
                    .join(", ")}`
                : `Row ${rowIndex + 1}`
            }
          >
            {row.letters.map((letter, index) => {
              const mark = row.marks[index];
              return (
                <span
                  key={index}
                  aria-hidden
                  className={cn(
                    "flex size-12 items-center justify-center rounded-lg border-2 text-xl font-bold uppercase sm:size-14",
                    mark ? TILE[mark] : letter ? "border-foreground/50" : "border-border",
                    row.checking && "animate-pulse"
                  )}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <p role="status" aria-live="polite" className="min-h-5 text-center text-sm font-medium text-destructive">
        {message}
      </p>

      {view && view.status !== "playing" && (
        <div className="glass-panel space-y-1 p-4 text-center">
          <p className="font-semibold">
            {view.status === "won"
              ? `Bravo! Solved in ${view.guesses.length}/${WORDLE_MAX_GUESSES}.`
              : "Not this time."}
          </p>
          <p className="text-sm">
            <span className="font-bold uppercase tracking-wider">{view.answer}</span>
            {view.meaning && <span className="text-muted-foreground"> · {view.meaning}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {view.isToday
              ? "A new puzzle comes tomorrow. Try another level above, or a past day below."
              : "Pick another day from the archive below."}
          </p>
        </div>
      )}

      {playing && (
        <div className="space-y-1.5" aria-label="Keyboard">
          {KEY_ROWS.map((keyRow, rowIndex) => (
            <div key={keyRow} className="flex justify-center gap-1">
              {rowIndex === 2 && (
                <button
                  type="button"
                  onClick={() => press("Enter")}
                  className="h-12 rounded-md bg-muted px-3 text-xs font-semibold uppercase"
                >
                  Enter
                </button>
              )}
              {[...keyRow].map((letter) => {
                const mark = keys[letter];
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => press(letter)}
                    aria-label={mark ? `${letter}, ${MARK_WORDS[mark]}` : letter}
                    className={cn(
                      "h-12 min-w-0 flex-1 rounded-md text-sm font-semibold uppercase sm:max-w-10",
                      mark === "absent"
                        ? "bg-secondary text-secondary-foreground opacity-35"
                        : mark
                          ? TILE[mark]
                          : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
              {rowIndex === 2 && (
                <button
                  type="button"
                  onClick={() => press("Backspace")}
                  aria-label="Delete letter"
                  className="flex h-12 items-center rounded-md bg-muted px-3"
                >
                  <Delete className="size-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {archive.length > 0 && (
        <section className="space-y-2" aria-label="Archive">
          <h2 className="text-sm font-semibold">Archive · {level}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {archive.map((day) => (
              <li key={day.date}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void open(level, day.date)}
                  aria-current={view?.date === day.date ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted",
                    view?.date === day.date ? "border-primary" : "border-border"
                  )}
                >
                  <span>
                    #{day.number} · {formatDay(day.date)}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      day.status === "won"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : day.status
                          ? "text-muted-foreground"
                          : "font-medium text-primary"
                    )}
                  >
                    {statusLabel(day.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Word checks use{" "}
        <a className="underline underline-offset-2" href="https://github.com/napolux/paroleitaliane" target="_blank" rel="noreferrer">
          paroleitaliane
        </a>{" "}
        by Francesco Napoletano (MIT) and{" "}
        <a className="underline underline-offset-2" href="https://github.com/hermitdave/FrequencyWords" target="_blank" rel="noreferrer">
          FrequencyWords
        </a>{" "}
        by Hermit Dave (CC BY-SA 4.0).
      </p>
    </div>
  );
}
