"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Delete } from "lucide-react";
import { SpeakButton } from "@/components/speak-button";
import { ShareButton } from "@/components/share-button";
import { Button } from "@/components/ui/button";
import { LANGUAGE_META, PROFICIENCY_LEVELS, type TargetLanguage } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useT, useUiLanguage } from "@/components/ui-language-provider";
import { pickLocalized, type UiLanguage } from "@/lib/i18n";
import {
  keyboardMarks,
  playWordle,
  WORDLE_LENGTH,
  WORDLE_MAX_GUESSES,
  wordleShareText,
  type WordleArchiveDay,
  type WordleMark,
  type WordleStatus,
  type WordleTurnResult,
  type WordleView,
} from "@/lib/wordle";
import { createClient } from "@/utils/supabase/client";

/** On-screen keys, and the only letters a physical keyboard may type. German is QWERTZ with its umlauts. */
const KEY_ROWS: Record<TargetLanguage, string[]> = {
  Italian: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
  German: ["qwertzuiopü", "asdfghjklöä", "yxcvbnm"],
};

function isLetter(language: TargetLanguage, key: string) {
  return key.length === 1 && KEY_ROWS[language].some((row) => row.includes(key.toLowerCase()));
}
/** A tile turns edge-on in HALF_FLIP_MS, shows its color, turns back; the next starts FLIP_GAP_MS later. */
const HALF_FLIP_MS = 250;
const FLIP_GAP_MS = 300;

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

/** "6 Nov" / "6 Kas": the puzzle's own day, whatever the device's time zone. */
function formatDay(date: string, language: UiLanguage) {
  return new Intl.DateTimeFormat(language, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function prefersMotion() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function shake(row: HTMLElement | null) {
  if (row && prefersMotion()) {
    row.animate(
      [{ translate: "0" }, { translate: "-6px" }, { translate: "6px" }, { translate: "-4px" }, { translate: "4px" }, { translate: "0" }],
      { duration: 300 }
    );
  }
}

function statusLabel(status: WordleStatus | null) {
  if (status === "won") return "Solved";
  if (status === "lost") return "Missed";
  if (status === "playing") return "In progress";
  return "Play";
}

export function WordleGame({
  language,
  initialLevel,
  initial,
}: {
  language: TargetLanguage;
  initialLevel: string;
  initial: WordleTurnResult;
}) {
  const [supabase] = useState(createClient);
  const [level, setLevel] = useState(initialLevel);
  const [today, setToday] = useState(initial.ok ? initial.today : null);
  const t = useT();
  const uiLanguage = useUiLanguage();
  const [view, setView] = useState<WordleView | null>(initial.ok ? initial.view : null);
  const [archive, setArchive] = useState<WordleArchiveDay[]>(initial.ok ? initial.archive ?? [] : []);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(initial.ok ? null : initial.error);
  // A guess or a level/day switch on its way to the database, or a row still flipping.
  const [pending, setPending] = useState(false);
  // The row being flipped and how many of its tiles show their color yet.
  const [revealing, setRevealing] = useState<{ row: number; shown: number } | null>(null);
  const currentRow = useRef<HTMLDivElement>(null);

  const playing = view?.status === "playing";

  async function open(nextLevel: string, date: string | null) {
    const day = date ?? today;
    if (!day || pending) {
      return;
    }
    setPending(true);
    const next = await playWordle(supabase, language, nextLevel, day, null);
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
    const rowElement = currentRow.current;
    if (!view || !rowElement) {
      return;
    }
    setPending(true);
    // The tiles start turning right away: the colors usually arrive before the
    // first one is edge-on, so the wait for the database is hidden in the flip.
    const tiles = [...rowElement.children] as HTMLElement[];
    const turns = prefersMotion()
      ? tiles.map((tile, index) =>
          tile.animate([{ rotate: "x 0deg" }, { rotate: "x 90deg" }], {
            duration: HALF_FLIP_MS,
            delay: index * FLIP_GAP_MS,
            easing: "ease-in",
            fill: "forwards",
          })
        )
      : [];

    const next = await playWordle(supabase, language, view.level, view.date, input);
    if (!next.ok) {
      turns.forEach((turn) => turn.cancel());
      shake(rowElement);
      setPending(false);
      setMessage(next.error);
      return;
    }
    const row = next.view.guesses.length - 1;
    setInput("");
    setMessage(null);
    setRevealing(turns.length ? { row, shown: 0 } : null);
    setView(next.view);
    // The archive only changes for this day, and only its status.
    setArchive((days) =>
      days.map((day) => (day.date === next.view.date ? { ...day, status: next.view.status } : day))
    );

    // Each tile waits edge-on (if the database was slow), takes its color, turns back.
    let last: Animation | undefined;
    for (const [index, turn] of turns.entries()) {
      await turn.finished;
      flushSync(() => setRevealing({ row, shown: index + 1 }));
      last = tiles[index].animate([{ rotate: "x 90deg" }, { rotate: "x 0deg" }], {
        duration: HALF_FLIP_MS,
        easing: "ease-out",
      });
      turn.cancel();
    }
    await last?.finished;
    setRevealing(null);
    setPending(false);
  }, [input, language, supabase, view]);

  const press = useCallback(
    (key: string) => {
      if (!view || !playing || pending) {
        return;
      }
      if (key === "Enter") {
        if (input.length < WORDLE_LENGTH) {
          setMessage(`Type a ${WORDLE_LENGTH}-letter word.`);
          shake(currentRow.current);
          return;
        }
        void submit();
        return;
      }
      if (key === "Backspace") {
        setInput((current) => current.slice(0, -1));
        return;
      }
      if (isLetter(language, key) && input.length < WORDLE_LENGTH) {
        setInput((current) => current + key.toLowerCase());
        setMessage(null);
      }
    },
    [input, language, pending, playing, submit, view]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) {
        return;
      }
      if (event.key === "Enter" || event.key === "Backspace" || isLetter(language, event.key)) {
        event.preventDefault();
        press(event.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [language, press]);

  // The keyboard and the result wait until the last row has finished flipping.
  const keys = keyboardMarks(view?.guesses.slice(0, revealing?.row) ?? []);
  const rows = Array.from({ length: WORDLE_MAX_GUESSES }, (_, index) => {
    const guess = view?.guesses[index];
    if (guess) {
      const shown = revealing?.row === index ? revealing.shown : WORDLE_LENGTH;
      return {
        letters: [...guess.word],
        marks: guess.marks.map((mark, letter) => (letter < shown ? mark : null)),
        revealed: shown === WORDLE_LENGTH,
        current: false,
      };
    }
    const current = playing && index === (view?.guesses.length ?? 0);
    return {
      letters: Array.from({ length: WORDLE_LENGTH }, (_, letter) => (current ? input[letter] ?? "" : "")),
      marks: Array.from({ length: WORDLE_LENGTH }, () => null as WordleMark | null),
      revealed: false,
      current,
    };
  });

  // Stays up while the last row still flips after the game has ended.
  const keyboard = playing || revealing !== null;

  return (
    // Phones while the keyboard shows: the title steps aside and the tiles size to the screen,
    // so the board and the keyboard (which takes the bottom bar's place) both fit.
    <div className={cn("mx-auto flex w-full max-w-lg flex-col gap-5", keyboard && "max-md:gap-3")}>
      <header className={cn("space-y-1", keyboard && "max-md:hidden")}>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Wordle</h1>
        <p className="text-sm text-muted-foreground">
          {t("Guess the 5-letter {language} word in {n} tries. One puzzle a day for each level.", {
            language: t(language),
            n: WORDLE_MAX_GUESSES,
          })}
        </p>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 touch-scroll" role="group" aria-label={t("Level")}>
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
            #{view.number} · {view.level} · {view.isToday ? t("Today") : formatDay(view.date, uiLanguage)}
          </span>
          {!view.isToday && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => void open(level, null)}>
              {t("Back to today")}
            </Button>
          )}
        </div>
      )}

      {/* lang: the tiles are capitalised; on a Turkish page "i" would become "İ". */}
      <div className="mx-auto grid gap-1.5" aria-label={t("Board")} lang={LANGUAGE_META[language].code}>
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            ref={row.current ? currentRow : undefined}
            className="grid grid-cols-5 gap-1.5"
            role="group"
            aria-label={
              row.revealed
                ? t("Guess {n}: {letters}", {
                    n: rowIndex + 1,
                    letters: row.letters
                      .map((letter, index) => `${letter.toUpperCase()} ${t(MARK_WORDS[row.marks[index]!])}`)
                      .join(", "),
                  })
                : t("Row {n}", { n: rowIndex + 1 })
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
                    keyboard && "max-sm:size-[clamp(2rem,calc((100dvh_-_26rem)_/_6),3rem)]",
                    mark ? TILE[mark] : letter ? "border-foreground/50" : "border-border"
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
        {message && t(message)}
      </p>

      {view && view.status !== "playing" && !revealing && (
        <div className="glass-panel space-y-1 p-4 text-center">
          <p className="font-semibold">
            {view.status === "won"
              ? t("Bravo! Solved in {n}/{max}.", { n: view.guesses.length, max: WORDLE_MAX_GUESSES })
              : t("Not this time.")}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-sm">
            <span lang={LANGUAGE_META[language].code} className="font-bold uppercase tracking-wider">{view.answer}</span>
            {view.answer && <SpeakButton className="-my-2" text={view.answer} language={language} />}
            {view.meaning && <span className="text-muted-foreground">· {pickLocalized(uiLanguage, view.meaning, view.meaningTr)}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {view.isToday
              ? t("A new puzzle comes tomorrow. Try another level above, or a past day below.")
              : t("Pick another day from the archive below.")}
          </p>
          <ShareButton
            className="mt-3 min-h-11"
            description={t("No spoilers: the link opens the same puzzle for your friends.")}
            text={() => wordleShareText(view, window.location.origin)}
          />
        </div>
      )}

      {keyboard && (
        // data-onscreen-keyboard: hides the phone bottom bar (app/globals.css); sticky keeps it in reach on small phones.
        <div
          data-onscreen-keyboard
          className="space-y-1.5 max-md:sticky max-md:bottom-0 max-md:bg-background max-md:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-md:pt-2"
          aria-label={t("Keyboard")}
          lang={LANGUAGE_META[language].code}
        >
          {KEY_ROWS[language].map((keyRow, rowIndex) => (
            <div key={keyRow} className="flex justify-center gap-1">
              {rowIndex === 2 && (
                <button
                  type="button"
                  onClick={() => press("Enter")}
                  // The app's language, inside a keyboard marked Italian/German: "GİR", not "GIR".
                  lang={uiLanguage}
                  className="h-12 rounded-md bg-muted px-3 text-xs font-semibold uppercase"
                >
                  {t("Enter")}
                </button>
              )}
              {[...keyRow].map((letter) => {
                const mark = keys[letter];
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => press(letter)}
                    aria-label={mark ? `${letter}, ${t(MARK_WORDS[mark])}` : letter}
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
                  aria-label={t("Delete letter")}
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
        <section className="space-y-2" aria-label={t("Archive")}>
          <h2 className="text-sm font-semibold">{t("Archive · {level}", { level })}</h2>
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
                    #{day.number} · {formatDay(day.date, uiLanguage)}
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
                    {t(statusLabel(day.status))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {language === "German" ? (
        <p className="text-xs text-muted-foreground">
          {t("Word checks")}:{" "}
          <a className="underline underline-offset-2" href="https://github.com/enz/german-wordlist" target="_blank" rel="noreferrer">
            german-wordlist
          </a>{" "}
          · Thomas Enz (CC0).
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("Word checks")}:{" "}
          <a className="underline underline-offset-2" href="https://github.com/napolux/paroleitaliane" target="_blank" rel="noreferrer">
            paroleitaliane
          </a>{" "}
          · Francesco Napoletano (MIT),{" "}
          <a className="underline underline-offset-2" href="https://github.com/hermitdave/FrequencyWords" target="_blank" rel="noreferrer">
            FrequencyWords
          </a>{" "}
          · Hermit Dave (CC BY-SA 4.0).
        </p>
      )}
    </div>
  );
}
