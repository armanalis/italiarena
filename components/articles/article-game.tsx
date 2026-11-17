"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { refreshDashboardAfterMatch } from "@/app/(app)/settings/actions";
import { useHowToPlayOpen } from "@/components/how-to-play";
import { ShareButton } from "@/components/share-button";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import {
  ARTICLE_GAME_NAME,
  type ArticleLanguage,
  BONUS_EVERY,
  SPRINT_MS,
  articleChoices,
  articleRule,
  articleShareText,
  bonusAfter,
  fillPreposition,
  finishSprint,
  hasArticleGame,
  loadArticleStats,
  loadSprintHistory,
  saveSprint,
  startSprint,
  toSprintArchive,
  withArticle,
  type ArticleCard,
  type ArticleStats,
  type SprintArchiveDay,
  type SprintHistory,
  type SprintKind,
  type SprintResult,
  type SprintStart,
} from "@/lib/articles";
import { LANGUAGE_META, PROFICIENCY_LEVELS, type TargetLanguage } from "@/lib/constants";
import { PREPOSITION_GAME_NAME, PREPOSITION_MS, PREPOSITION_RULES } from "@/lib/prepositions";
import { formatPuzzleDay } from "@/lib/wordle";
import { cn } from "@/lib/utils";
import { fill, useT, useUiLanguage } from "@/components/ui-language-provider";
import { pickLocalized } from "@/lib/i18n";
import { createClient } from "@/utils/supabase/client";

type Phase = "ready" | "starting" | "playing" | "sending" | "done";
type Feedback = { card: ArticleCard; picked: string; right: boolean };

const NO_STATS: ArticleStats = { best: {}, today: {}, accuracy: {} };

export function ArticleGame({
  language,
  initialLevel,
  initialStats,
  initialHistory,
  initialDay,
  kind = "article",
}: {
  language: TargetLanguage;
  initialLevel: string;
  initialStats: ArticleStats | null;
  initialHistory: SprintHistory | null;
  initialDay: string | null;
  kind?: SprintKind;
}) {
  const t = useT();
  const uiLanguage = useUiLanguage();
  const helpOpen = useHowToPlayOpen();
  const [supabase] = useState(() => createClient());
  const [level, setLevel] = useState(initialLevel);
  const [stats, setStats] = useState(initialStats ?? NO_STATS);
  const [archiveToday, setArchiveToday] = useState(initialHistory?.today ?? null);
  const [archive, setArchive] = useState<SprintArchiveDay[]>(() =>
    initialHistory ? toSprintArchive(initialHistory.today, initialHistory.days) : []
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(initialDay);
  const [phase, setPhase] = useState<Phase>("ready");
  const [sprint, setSprint] = useState<SprintStart | null>(null);
  const [index, setIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [msLeft, setMsLeft] = useState(SPRINT_MS);
  const [bonusShown, setBonusShown] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<SprintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // answers[i] is the article picked for card i.
  const [answers, setAnswers] = useState<string[]>([]);
  // The clock's end, moved by bonuses; `ended` stops the clock and the last card both sending.
  const deadline = useRef(0);
  const ended = useRef(false);

  const code = LANGUAGE_META[language].code;
  const card = phase === "playing" ? sprint?.cards[index] : undefined;
  const choices = cardButtons(card, kind, language);
  const today = stats.today[level];
  const best = stats.best[level];
  const duration = sprint?.ms ?? (kind === "preposition" ? PREPOSITION_MS : SPRINT_MS);
  const title = kind === "preposition" ? PREPOSITION_GAME_NAME[language] : ARTICLE_GAME_NAME[language as ArticleLanguage];

  const finish = useCallback(async (picked: string[]) => {
    if (!sprint || ended.current) {
      return;
    }
    ended.current = true;
    setMsLeft(0);
    setPhase("sending");
    const sent = await finishSprint(supabase, sprint.runId, picked);
    if (sent.ok) {
      // Missed nouns are new mistakes: the Stats page must not show its cached list.
      void refreshDashboardAfterMatch();
      setResult(sent.value);
      const playedToday = !sprint.date || !archiveToday || sprint.date === archiveToday;
      setStats((old) => ({
        ...old,
        best: { ...old.best, [level]: Math.max(sent.value.best ?? 0, old.best[level] ?? 0) },
        today: sprint.scored && playedToday ? { ...old.today, [level]: sent.value.score } : old.today,
      }));
      if (sprint.date) {
        setArchive((days) => days.map((day) => (day.date === sprint.date ? { ...day, score: sent.value.score } : day)));
      }
    } else {
      setError(sent.error);
      // The answers may have arrived even though the reply did not: show what the server kept.
      void loadArticleStats(supabase, language, kind).then((fresh) => fresh && setStats(fresh));
    }
    setPhase("done");
  }, [archiveToday, kind, language, level, sprint, supabase]);

  useEffect(() => {
    let cancel = false;
    void loadSprintHistory(supabase, language, level, kind).then((history) => {
      if (cancel || !history) return;
      setArchiveToday(history.today);
      setArchive(toSprintArchive(history.today, history.days));
    });
    return () => {
      cancel = true;
    };
  }, [kind, language, level, supabase]);

  async function start(date: string | null = null) {
    if (helpOpen) return;
    setPhase("starting");
    setError(null);
    setResult(null);
    setFeedback(null);
    const started = await startSprint(supabase, language, level, kind, date);
    if (!started.ok) {
      setError(started.error);
      setPhase("ready");
      return;
    }
    setAnswers([]);
    ended.current = false;
    // A reload during the scored minute resumes it with the time it has left.
    deadline.current = performance.now() + started.value.msLeft;
    setSprint(started.value);
    setIndex(0);
    setStreak(0);
    setMsLeft(started.value.msLeft);
    setPhase("playing");
  }

  const pick = useCallback(
    (article: string) => {
      if (phase !== "playing" || !sprint || ended.current || helpOpen) {
        return;
      }
      const current = sprint.cards[index];
      const right = article === current.article;
      const picked = [...answers, article];
      setAnswers(picked);
      const nextStreak = right ? streak + 1 : 0;
      const bonus = bonusAfter(nextStreak, sprint.bonusMs ?? 1_000);
      if (bonus) {
        deadline.current += bonus;
        setBonusShown((shown) => shown + 1);
      }
      setStreak(nextStreak);
      setFeedback({ card: current, picked: article, right });
      if (picked.length % BONUS_EVERY === 0) {
        saveSprint(supabase, sprint.runId, picked);
      }
      if (index + 1 >= sprint.cards.length) {
        void finish(picked);
      } else {
        setIndex(index + 1);
      }
    },
    [answers, finish, helpOpen, index, phase, sprint, streak, supabase]
  );

  useEffect(() => {
    if (phase !== "playing" || !sprint || answers.length === 0) {
      return;
    }
    // A phone call or app switch pauses the page. The finish may then arrive
    // after the clock; the server scores the last save, so write one now.
    const runId = sprint.runId;
    function onHide() {
      if (document.visibilityState === "hidden") {
        saveSprint(supabase, runId, answers);
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [answers, phase, sprint, supabase]);

  useEffect(() => {
    if (phase !== "playing" || helpOpen) {
      return;
    }
    const tick = window.setInterval(() => {
      const left = deadline.current - performance.now();
      if (left <= 0) {
        void finish(answers);
      } else {
        setMsLeft(left);
      }
    }, 100);
    return () => window.clearInterval(tick);
  }, [answers, finish, helpOpen, phase]);

  // Keys 1–4 on computers.
  useEffect(() => {
    if (!card || helpOpen) {
      return;
    }
    const keys = cardButtons(card, kind, language);
    function onKey(event: KeyboardEvent) {
      const choice = keys[Number(event.key) - 1];
      if (choice && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        pick(choice);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, helpOpen, kind, language, pick]);

  const played = sprint ? sprint.cards.slice(0, answers.length) : [];
  const rightCount = played.filter((played, i) => answers[i] === played.article).length;
  const missed = [
    ...new Map(
      played
        .map((played, i) => ({ card: played, picked: answers[i] }))
        .filter(({ card, picked }) => picked !== card.article)
        .map((miss) => [miss.card.id, miss])
    ).values(),
  ];
  // Right every time it came up; a noun missed even once is listed under Missed only.
  const missedIds = new Set(missed.map(({ card }) => card.id));
  const knew = [...new Map(played.filter((card) => !missedIds.has(card.id)).map((card) => [card.id, card])).values()];

  function chooseLevel(option: string) {
    setLevel(option);
    setSelectedDay(null);
    setPhase("ready");
    setResult(null);
    setError(null);
  }

  function backToToday() {
    setSelectedDay(null);
    setPhase("ready");
    setSprint(null);
    setResult(null);
    setError(null);
    setFeedback(null);
  }

  const viewingPast = Boolean(selectedDay && archiveToday && selectedDay !== archiveToday);
  const pastDay = viewingPast ? (archive.find((day) => day.date === selectedDay) ?? { date: selectedDay!, score: null }) : null;
  const sprintPast = Boolean(sprint?.date && archiveToday && sprint.date !== archiveToday);
  const bonusSeconds = Math.round((sprint?.bonusMs ?? 1_000) / 1000);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {kind === "preposition"
            ? t("Fill the blank in each {language} sentence. One scored Sprint a day for each level, then practice as much as you like.", { language: t(language) })
            : t("Pick the article of each {language} noun, as fast as you can. One scored Sprint a day for each level, then practice as much as you like.", { language: t(language) })}
        </p>
      </header>

      {phase !== "playing" && phase !== "sending" && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 touch-scroll" role="group" aria-label={t("Level")}>
          {PROFICIENCY_LEVELS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === level}
              disabled={phase === "starting"}
              onClick={() => chooseLevel(option)}
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
      )}

      {(phase === "ready" || phase === "starting") && (
        <div className="glass-panel space-y-4 p-5 text-center">
          {pastDay ? (
            <div className="space-y-1">
              <p className="font-semibold">
                {formatPuzzleDay(pastDay.date, uiLanguage)} · {level}
              </p>
              {pastDay.score !== null && <p className="text-4xl font-bold tabular-nums">{pastDay.score}</p>}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-semibold">
                {today === undefined ? t("Today's Sprint · {level}", { level }) : t("Today's Sprint: {score}", { score: today })}
              </p>
              <p className="text-sm text-muted-foreground">
                {kind === "preposition"
                  ? t("90 seconds · every {n} right in a row add 10 seconds", { n: BONUS_EVERY })
                  : t("60 seconds · every {n} right in a row add a second", { n: BONUS_EVERY })}
                {best !== undefined && ` · ${t("best {n}", { n: best })}`}
              </p>
            </div>
          )}
          {(!pastDay || pastDay.score === null) && (
            <Button
              type="button"
              className="min-h-12 w-full text-base"
              disabled={phase === "starting" || helpOpen}
              onClick={() => void start(pastDay ? pastDay.date : null)}
            >
              {phase === "starting" && <Loader2 className="size-4 animate-spin" />}
              {pastDay ? t("Start") : today === undefined ? t("Start today's Sprint") : t("Practice")}
            </Button>
          )}
          {pastDay && (
            <Button type="button" variant="outline" className="min-h-11" onClick={backToToday}>
              {t("Back to today")}
            </Button>
          )}
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {t(error)}
            </p>
          )}
        </div>
      )}

      {(phase === "playing" || phase === "sending") && sprint && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold tabular-nums" aria-label={t("{n} seconds left", { n: Math.ceil(msLeft / 1000) })}>
                {Math.ceil(msLeft / 1000)}s
                {bonusShown > 0 && (
                  <span key={bonusShown} className="ml-1.5 text-emerald-600 animate-out fade-out duration-1000 fill-mode-forwards dark:text-emerald-400">
                    +{bonusSeconds}s
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {sprintPast && sprint.date ? `${formatPuzzleDay(sprint.date, uiLanguage)} · ${level}` : `${sprint.scored ? t("Today's Sprint") : t("Practice")} · ${level}`}
              </span>
              <span className="font-semibold tabular-nums">{t("{n} right", { n: rightCount })}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-100"
                style={{ width: `${Math.min(100, (msLeft / duration) * 100)}%` }}
              />
            </div>
          </div>

          <div className="glass-panel flex min-h-36 flex-col items-center justify-center gap-1 p-6 text-center">
            {card ? (
              <>
                <p lang={code} className={kind === "preposition" ? "flex min-h-32 items-center justify-center text-xl font-bold leading-snug tracking-tight sm:text-2xl" : "text-3xl font-bold tracking-tight sm:text-4xl"}>
                  {card.noun}
                </p>
                {card.meaning && (
                  <p className="text-sm text-muted-foreground">{pickLocalized(uiLanguage, card.meaning, { tr: card.meaningTr, it: card.meaningIt })}</p>
                )}
              </>
            ) : (
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label={t("Sending your answers")} />
            )}
          </div>

          <div className={cn("grid gap-2", choices.length === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
            {choices.map((choice, i) => (
              <Button
                key={choice}
                type="button"
                variant="outline"
                lang={code}
                disabled={!card}
                onClick={() => pick(choice)}
                className="relative h-auto min-h-16 min-w-0 whitespace-normal px-2 text-center text-lg font-bold leading-tight sm:text-xl"
              >
                {choice}
                <span className="absolute top-1 right-2 hidden text-[10px] font-normal text-muted-foreground sm:inline" aria-hidden>
                  {i + 1}
                </span>
              </Button>
            ))}
          </div>

          <p role="status" aria-live="polite" className="min-h-10 text-center text-sm">
            {feedback &&
              (feedback.right ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-4" aria-hidden />
                  <span lang={code}>{shownAnswer(feedback.card, kind)}</span>
                  {streak > 0 && streak % BONUS_EVERY !== 0 && (
                    <span className="text-muted-foreground"> · {t("{n}/{total} to +{seconds}s", { n: streak % BONUS_EVERY, total: BONUS_EVERY, seconds: bonusSeconds })}</span>
                  )}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  <X className="mr-1 inline size-4 align-text-bottom" aria-hidden />
                  <span lang={code} className="font-semibold">
                    {shownAnswer(feedback.card, kind)}
                  </span>
                  {ruleLine(feedback.card, kind, language) && (
                    <span className="block text-xs text-muted-foreground">
                      {t(ruleLine(feedback.card, kind, language)!)}
                    </span>
                  )}
                </span>
              ))}
          </p>
        </div>
      )}

      {phase === "done" && sprint && (
        <div className="space-y-4">
          <div className="glass-panel space-y-2 p-5 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {sprintPast && sprint.date ? `${formatPuzzleDay(sprint.date, uiLanguage)} · ${level}` : `${sprint.scored ? t("Today's Sprint") : t("Practice")} · ${level}`}
            </p>
            {result ? (
              <>
                <p className="text-4xl font-bold tabular-nums">{result.score}</p>
                <p className="text-sm text-muted-foreground">
                  {result.rejected
                    ? t("Your answers reached us too late, so this one counts as 0.")
                    : `${t("right out of {n}", { n: answers.length })}${result.best !== null ? ` · ${t("best {n}", { n: result.best })}` : ""}`}
                </p>
              </>
            ) : sprint.scored && !sprintPast && today !== undefined ? (
              // A retry after a lost reply: the server had the answers all along.
              <p className="text-4xl font-bold tabular-nums">{today}</p>
            ) : (
              <>
                <p role="alert" className="text-sm font-medium text-destructive">
                  {error && t(error)}
                </p>
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => {
                    ended.current = false;
                    void finish(answers);
                  }}
                >
                  {t("Try again")}
                </Button>
              </>
            )}
            {sprintPast && (
              <p className="text-xs text-muted-foreground">{t("Pick another day from the archive below.")}</p>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {sprint.scored && result && !result.rejected && (
                <ShareButton
                  className="min-h-11"
                  description={t("Just your score: the link opens the same game for your friends.")}
                  text={() => articleShareText(language, level, result.score, window.location.origin, kind, sprint.date ?? archiveToday ?? undefined)}
                />
              )}
              {sprintPast ? (
                <Button type="button" variant="outline" className="min-h-11" onClick={backToToday}>
                  {t("Back to today")}
                </Button>
              ) : (
                <Button type="button" variant="outline" className="min-h-11" disabled={helpOpen} onClick={() => void start(null)}>
                  {t("Practice")}
                </Button>
              )}
            </div>
          </div>

          {missed.length > 0 && (
            <section className="space-y-2" aria-labelledby="missed-heading">
              <h2 id="missed-heading" className="text-sm font-semibold">
                {t("Missed")} {result && !result.rejected && <span className="font-normal text-muted-foreground">· {t("added to your Mistakes")}</span>}
              </h2>
              <ul className="space-y-1.5">
                {missed.map(({ card: miss, picked }) => (
                  <WordRow key={miss.id} card={miss} language={language} kind={kind} picked={picked} />
                ))}
              </ul>
            </section>
          )}

          {/* Right ones too, like the Word Wheel's answers: a lucky guess still gets its meaning and sound. */}
          {knew.length > 0 && (
            <section className="space-y-2" aria-labelledby="knew-heading">
              <h2 id="knew-heading" className="text-sm font-semibold">
                {t("Right")}
              </h2>
              <ul className="space-y-1.5">
                {knew.map((right) => (
                  <WordRow key={right.id} card={right} language={language} kind={kind} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {phase !== "playing" && phase !== "sending" && archive.length > 0 && (
        <section className="space-y-2" aria-label={t("Archive")}>
          <h2 className="text-sm font-semibold">{t("Archive · {level}", { level })}</h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {archive.map((day) => (
              <li key={day.date}>
                <button
                  type="button"
                  disabled={phase === "starting"}
                  onClick={() => {
                    setSelectedDay(day.date);
                    setPhase("ready");
                    setSprint(null);
                    setResult(null);
                    setError(null);
                    setFeedback(null);
                  }}
                  aria-current={selectedDay === day.date ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted",
                    selectedDay === day.date ? "border-primary" : "border-border"
                  )}
                >
                  <span>{formatPuzzleDay(day.date, uiLanguage)}</span>
                  <span className={cn("text-xs", day.score === null ? "font-medium text-primary" : "text-muted-foreground")}>
                    {day.score === null ? t("Play") : day.score}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {kind === "article" && (
        <p className="text-xs text-muted-foreground">
          {fill(t("Every article is checked against {source} (CC BY-SA 4.0)."), {
            source: (
              <a className="underline underline-offset-2" href="https://www.wiktionary.org/" target="_blank" rel="noreferrer">
                Wiktionary
              </a>
            ),
          })}
        </p>
      )}
    </div>
  );
}

/** One noun of the results: article, noun and meaning, what was picked if it was wrong, and its sound. */
function WordRow({
  card,
  language,
  kind,
  picked,
}: {
  card: ArticleCard;
  language: TargetLanguage;
  kind: SprintKind;
  picked?: string;
}) {
  const t = useT();
  const uiLanguage = useUiLanguage();
  const code = LANGUAGE_META[language].code;
  const rule = ruleLine(card, kind, language);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3 py-1.5 text-sm">
      {picked === undefined && (
        <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span lang={code} className="font-semibold">
          {shownAnswer(card, kind)}
        </span>
        {card.meaning && (
          <span className="text-muted-foreground"> · {pickLocalized(uiLanguage, card.meaning, { tr: card.meaningTr, it: card.meaningIt })}</span>
        )}
        {picked !== undefined && (
          <span className="block text-xs text-red-600 dark:text-red-400">
            {fill(t("You: {answer}"), { answer: <span lang={code}>{picked}</span> })}
          </span>
        )}
        {rule && <span className="block text-xs text-muted-foreground">{t(rule)}</span>}
      </span>
      <SpeakButton className="-my-1.5" text={shownAnswer(card, kind)} language={language} />
    </li>
  );
}

function cardButtons(card: ArticleCard | undefined, kind: SprintKind, language: TargetLanguage): string[] {
  if (!card) return [];
  if (card.choices?.length) return card.choices;
  return kind === "article" && hasArticleGame(language) ? [...articleChoices(language, card.article)] : [];
}

function shownAnswer(card: ArticleCard, kind: SprintKind): string {
  return kind === "preposition" ? fillPreposition(card.noun, card.article) : withArticle(card.article, card.noun);
}

/** English rule sentence, or null when this card has no known rule. */
function ruleLine(card: ArticleCard, kind: SprintKind, language: TargetLanguage): string | null {
  if (kind === "preposition") return (card.rule && PREPOSITION_RULES[card.rule]) || null;
  return hasArticleGame(language) ? articleRule(language, card.noun, card.article) : null;
}
