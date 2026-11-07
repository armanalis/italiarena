"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { refreshDashboardAfterMatch } from "@/app/(app)/settings/actions";
import { ShareButton } from "@/components/share-button";
import { SpeakButton } from "@/components/speak-button";
import { Button } from "@/components/ui/button";
import {
  ARTICLE_GAME_NAME,
  BONUS_EVERY,
  SPRINT_MS,
  articleChoices,
  articleRule,
  articleShareText,
  bonusAfter,
  finishSprint,
  loadArticleStats,
  startSprint,
  withArticle,
  type ArticleCard,
  type ArticleStats,
  type SprintResult,
  type SprintStart,
} from "@/lib/articles";
import { LANGUAGE_META, PROFICIENCY_LEVELS, type TargetLanguage } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fill, useT } from "@/components/ui-language-provider";
import { createClient } from "@/utils/supabase/client";

type Phase = "ready" | "starting" | "playing" | "sending" | "done";
type Feedback = { card: ArticleCard; picked: string; right: boolean };

const NO_STATS: ArticleStats = { best: {}, today: {}, accuracy: {} };

export function ArticleGame({
  language,
  initialLevel,
  initialStats,
}: {
  language: TargetLanguage;
  initialLevel: string;
  initialStats: ArticleStats | null;
}) {
  const t = useT();
  const [supabase] = useState(() => createClient());
  const [level, setLevel] = useState(initialLevel);
  const [stats, setStats] = useState(initialStats ?? NO_STATS);
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
  const choices = card ? articleChoices(language, card.article) : [];
  const today = stats.today[level];
  const best = stats.best[level];

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
      setStats((old) => ({
        ...old,
        best: { ...old.best, [level]: Math.max(sent.value.best ?? 0, old.best[level] ?? 0) },
        today: sprint.scored ? { ...old.today, [level]: sent.value.score } : old.today,
      }));
    } else {
      setError(sent.error);
      // The answers may have arrived even though the reply did not: show what the server kept.
      void loadArticleStats(supabase, language).then((fresh) => fresh && setStats(fresh));
    }
    setPhase("done");
  }, [language, level, sprint, supabase]);

  async function start() {
    setPhase("starting");
    setError(null);
    setResult(null);
    setFeedback(null);
    const started = await startSprint(supabase, language, level);
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
      if (phase !== "playing" || !sprint || ended.current) {
        return;
      }
      const current = sprint.cards[index];
      const right = article === current.article;
      const picked = [...answers, article];
      setAnswers(picked);
      const nextStreak = right ? streak + 1 : 0;
      const bonus = bonusAfter(nextStreak);
      if (bonus) {
        deadline.current += bonus;
        setBonusShown((shown) => shown + 1);
      }
      setStreak(nextStreak);
      setFeedback({ card: current, picked: article, right });
      if (index + 1 >= sprint.cards.length) {
        void finish(picked);
      } else {
        setIndex(index + 1);
      }
    },
    [answers, finish, index, phase, sprint, streak]
  );

  useEffect(() => {
    if (phase !== "playing") {
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
    // A phone call or app switch pauses the page, and answers sent after the
    // clock count as 0 on the server: send what is answered as soon as it hides.
    function onHide() {
      if (document.visibilityState === "hidden") {
        void finish(answers);
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [answers, finish, phase]);

  // Keys 1–4 on computers.
  useEffect(() => {
    if (!card) {
      return;
    }
    const keys = articleChoices(language, card.article);
    function onKey(event: KeyboardEvent) {
      const choice = keys[Number(event.key) - 1];
      if (choice && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        pick(choice);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, language, pick]);

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
    setPhase("ready");
    setResult(null);
    setError(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{ARTICLE_GAME_NAME[language]}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Pick the article of each {language} noun, as fast as you can. One scored Sprint a day for each level, then practice as much as you like.", { language: t(language) })}
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
          <div className="space-y-1">
            <p className="font-semibold">
              {today === undefined ? t("Today's Sprint · {level}", { level }) : t("Today's Sprint: {score}", { score: today })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("60 seconds · every {n} right in a row add a second", { n: BONUS_EVERY })}
              {best !== undefined && ` · ${t("best {n}", { n: best })}`}
            </p>
          </div>
          <Button
            type="button"
            className="min-h-12 w-full text-base"
            disabled={phase === "starting"}
            onClick={() => void start()}
          >
            {phase === "starting" && <Loader2 className="size-4 animate-spin" />}
            {today === undefined ? t("Start today's Sprint") : t("Practice")}
          </Button>
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
                    +1s
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">
                {sprint.scored ? t("Today's Sprint") : t("Practice")} · {level}
              </span>
              <span className="font-semibold tabular-nums">{t("{n} right", { n: rightCount })}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-100"
                style={{ width: `${Math.min(100, (msLeft / SPRINT_MS) * 100)}%` }}
              />
            </div>
          </div>

          <div className="glass-panel flex min-h-36 flex-col items-center justify-center gap-1 p-6 text-center">
            {card ? (
              <>
                <p lang={code} className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {card.noun}
                </p>
                <p className="text-sm text-muted-foreground">{card.meaning}</p>
              </>
            ) : (
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label={t("Sending your answers")} />
            )}
          </div>

          <div className={cn("grid gap-2", choices.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
            {(choices.length ? choices : articleChoices(language, "")).map((choice, i) => (
              <Button
                key={choice}
                type="button"
                variant="outline"
                lang={code}
                disabled={!card}
                onClick={() => pick(choice)}
                className="relative min-h-16 text-xl font-bold"
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
                  <span lang={code}>{withArticle(feedback.card.article, feedback.card.noun)}</span>
                  {streak > 0 && streak % BONUS_EVERY !== 0 && (
                    <span className="text-muted-foreground"> · {t("{n}/{total} to +1s", { n: streak % BONUS_EVERY, total: BONUS_EVERY })}</span>
                  )}
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  <X className="mr-1 inline size-4 align-text-bottom" aria-hidden />
                  <span lang={code} className="font-semibold">
                    {withArticle(feedback.card.article, feedback.card.noun)}
                  </span>
                  {articleRule(language, feedback.card.noun, feedback.card.article) && (
                    <span className="block text-xs text-muted-foreground">
                      {t(articleRule(language, feedback.card.noun, feedback.card.article)!)}
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
              {sprint.scored ? t("Today's Sprint") : t("Practice")} · {level}
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
            ) : sprint.scored && today !== undefined ? (
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
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              {sprint.scored && result && !result.rejected && (
                <ShareButton
                  className="min-h-11"
                  description={t("Just your score: the link opens the same game for your friends.")}
                  text={() => articleShareText(language, level, result.score, window.location.origin)}
                />
              )}
              <Button type="button" variant="outline" className="min-h-11" onClick={() => void start()}>
                {t("Practice")}
              </Button>
            </div>
          </div>

          {missed.length > 0 && (
            <section className="space-y-2" aria-labelledby="missed-heading">
              <h2 id="missed-heading" className="text-sm font-semibold">
                {t("Missed")} {result && !result.rejected && <span className="font-normal text-muted-foreground">· {t("added to your Mistakes")}</span>}
              </h2>
              <ul className="space-y-1.5">
                {missed.map(({ card: miss, picked }) => (
                  <WordRow key={miss.id} card={miss} language={language} picked={picked} />
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
                  <WordRow key={right.id} card={right} language={language} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {fill(t("Every article is checked against {source} (CC BY-SA 4.0)."), {
          source: (
            <a className="underline underline-offset-2" href="https://www.wiktionary.org/" target="_blank" rel="noreferrer">
              Wiktionary
            </a>
          ),
        })}
      </p>
    </div>
  );
}

/** One noun of the results: article, noun and meaning, what was picked if it was wrong, and its sound. */
function WordRow({ card, language, picked }: { card: ArticleCard; language: TargetLanguage; picked?: string }) {
  const t = useT();
  const code = LANGUAGE_META[language].code;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3 py-1.5 text-sm">
      {picked === undefined && (
        <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span lang={code} className="font-semibold">
          {withArticle(card.article, card.noun)}
        </span>
        <span className="text-muted-foreground"> · {card.meaning}</span>
        {picked !== undefined && (
          <span className="block text-xs text-red-600 dark:text-red-400">
            {fill(t("You: {answer}"), { answer: <span lang={code}>{picked}</span> })}
          </span>
        )}
      </span>
      <SpeakButton className="-my-1.5" text={withArticle(card.article, card.noun)} language={language} />
    </li>
  );
}
