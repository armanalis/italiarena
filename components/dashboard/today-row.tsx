/** The Arena's "Games" grid: every game with today's progress. On phones it is the only way into them. */
import Link from "next/link";
import { BookOpen, Check, ChevronRight, CircleDashed, Flame, Grid3x3, Images, Timer, type LucideIcon } from "lucide-react";
import { ARTICLE_GAME_NAME, hasArticleGame, type ArticleLanguage, type ArticleStats } from "@/lib/articles";
import type { TargetLanguage } from "@/lib/constants";
import { reviewMinutes } from "@/lib/review";
import type { PassaparolaTurnResult } from "@/lib/passaparola";
import type { GameStreak } from "@/lib/push";
import type { Translate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";
import { WORDLE_MAX_GUESSES, type WordleTurnResult } from "@/lib/wordle";

type Tile = {
  title: string;
  status: string;
  done: boolean;
  icon: LucideIcon;
  accent: string;
  href?: string;
  /** Days in this game's streak, shown next to the title. */
  streak?: number;
};

type Streaks = Partial<Record<GameStreak["game"], GameStreak>>;

function wordleTile(t: Translate, result: WordleTurnResult, streak: GameStreak | undefined): Tile {
  const view = result.ok ? result.view : null;
  const guesses = view?.guesses.length ?? 0;
  return {
    title: "Wordle",
    status:
      view?.status === "won"
        ? t("Solved {n}/{max}", { n: guesses, max: WORDLE_MAX_GUESSES })
        : view?.status === "lost"
          ? t("Missed today")
          : guesses > 0
            ? t("In progress · {n}/{max}", { n: guesses, max: WORDLE_MAX_GUESSES })
            : t("Not played yet"),
    done: view?.status === "won" || view?.status === "lost",
    icon: Grid3x3,
    accent: "text-emerald-500",
    href: "/wordle",
    streak: streak?.streak,
  };
}

function passaparolaTile(t: Translate, result: PassaparolaTurnResult, streak: GameStreak | undefined): Tile {
  const view = result.ok ? result.view : null;
  const right = view ? Object.values(view.marks).filter((mark) => mark === "right").length : 0;
  return {
    title: t("Word Wheel"),
    status: view?.finished
      ? t("{right}/{total} right", { right, total: view.clues.length })
      : view?.started
        ? t("In progress")
        : t("Not played yet · 5 min"),
    done: Boolean(view?.finished),
    icon: CircleDashed,
    accent: "text-sky-500",
    href: "/word-wheel",
    streak: streak?.streak,
  };
}

function articlesTile(
  t: Translate,
  language: ArticleLanguage,
  level: string,
  stats: ArticleStats | null,
  streak: GameStreak | undefined
): Tile {
  const today = stats?.today[level];
  const best = stats?.best[level];
  return {
    title: ARTICLE_GAME_NAME[language],
    status:
      today !== undefined
        ? best
          ? t("Sprint {score} · best {best}", { score: today, best })
          : t("Sprint {score}", { score: today })
        : best
          ? t("Not played yet · best {best}", { best })
          : t("Not played yet · 60 s"),
    done: today !== undefined,
    icon: Timer,
    accent: "text-violet-500",
    href: "/articles",
    streak: streak?.streak,
  };
}

const pictureDuelTile = (t: Translate): Tile => ({
  title: t("Picture Duel"),
  status: t("With a friend · 60 s each"),
  done: false,
  icon: Images,
  accent: "text-rose-500",
  href: "/picture-duel",
});

function arenaStreakTile(t: Translate, streak: GameStreak | undefined): Tile {
  const days = streak?.streak ?? 0;
  return {
    title: days > 0 ? t("{n}-day Arena streak", { n: days }) : t("Arena streak"),
    status: streak?.played_today
      ? t("Done for today")
      : days > 0
        ? t("1 match keeps it")
        : t("Play 1 match to start"),
    done: Boolean(streak?.played_today),
    icon: Flame,
    accent: "text-orange-500",
  };
}

const TILE = "flex h-full items-center gap-3 rounded-2xl border border-border px-3 py-2.5";

export async function TodayRow({
  wordle,
  passaparola,
  articles,
  reviewDue,
  language,
  level,
  streaks,
}: {
  wordle: WordleTurnResult;
  passaparola: PassaparolaTurnResult;
  articles: ArticleStats | null;
  /** Mistakes due for review today, in this language. */
  reviewDue: number;
  language: TargetLanguage;
  level: string;
  streaks: Streaks;
}) {
  const t = await getT();
  const tiles = [
    wordleTile(t, wordle, streaks.wordle),
    passaparolaTile(t, passaparola, streaks.passaparola),
    ...(hasArticleGame(language) ? [articlesTile(t, language, level, articles, streaks.articles)] : []),
    pictureDuelTile(t),
    arenaStreakTile(t, streaks.arena),
  ];

  return (
    <section aria-labelledby="games-heading" className="mx-auto w-full max-w-3xl space-y-2">
      <h2 id="games-heading" className="text-sm font-semibold text-muted-foreground">
        {t("Games")}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {tiles.map(({ title, status, done, icon: Icon, accent, href, streak }, index) => {
          const content = (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Icon className={cn("size-4", accent)} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {title}
                  {Boolean(streak) && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-orange-500">
                      <Flame className="size-3" aria-hidden />
                      <span aria-hidden>{streak}</span>
                      <span className="sr-only">{t("{n}-day streak", { n: streak ?? 0 })}</span>
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{status}</span>
              </span>
              {done ? (
                <Check className="size-4 shrink-0 text-emerald-500" aria-label={t("Done")} />
              ) : (
                href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </>
          );
          return (
            // Odd count: the last tile takes the full row on two columns.
            <li key={title} className={tiles.length % 2 && index === tiles.length - 1 ? "sm:col-span-2" : undefined}>
              {href ? (
                <Link href={href} className={cn(TILE, "transition-colors hover:bg-muted")}>
                  {content}
                </Link>
              ) : (
                <div className={TILE}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {/* h-auto: outside the grid, TILE's h-full would stretch it over the sections below. */}
      {reviewDue > 0 && (
        <Link href="/stats?review=1" className={cn(TILE, "h-auto transition-colors hover:bg-muted")}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <BookOpen className="size-4 text-primary" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {t("{n} to review today", { n: reviewDue })}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {t("About {n} min · mistakes come back until they stick", { n: reviewMinutes(reviewDue) })}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </Link>
      )}
    </section>
  );
}
