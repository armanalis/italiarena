/** The Arena's "Today" row: today's Wordle, Passaparola and Arena streak at a glance. */
import Link from "next/link";
import { Check, ChevronRight, CircleDashed, Flame, Grid3x3, type LucideIcon } from "lucide-react";
import type { PassaparolaTurnResult } from "@/lib/passaparola";
import type { GameStreak } from "@/lib/push";
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

function wordleTile(result: WordleTurnResult, streak: GameStreak | undefined): Tile {
  const view = result.ok ? result.view : null;
  const guesses = view?.guesses.length ?? 0;
  return {
    title: "Wordle",
    status:
      view?.status === "won"
        ? `Solved ${guesses}/${WORDLE_MAX_GUESSES}`
        : view?.status === "lost"
          ? "Missed today"
          : guesses > 0
            ? `In progress · ${guesses}/${WORDLE_MAX_GUESSES}`
            : "Not played yet",
    done: view?.status === "won" || view?.status === "lost",
    icon: Grid3x3,
    accent: "text-emerald-500",
    href: "/wordle",
    streak: streak?.streak,
  };
}

function passaparolaTile(result: PassaparolaTurnResult, streak: GameStreak | undefined): Tile {
  const view = result.ok ? result.view : null;
  const right = view ? Object.values(view.marks).filter((mark) => mark === "right").length : 0;
  return {
    title: "Word Wheel",
    status: view?.finished
      ? `${right}/${view.clues.length} right`
      : view?.started
        ? "In progress"
        : "Not played yet · 5 min",
    done: Boolean(view?.finished),
    icon: CircleDashed,
    accent: "text-sky-500",
    href: "/word-wheel",
    streak: streak?.streak,
  };
}

function arenaStreakTile(streak: GameStreak | undefined): Tile {
  const days = streak?.streak ?? 0;
  return {
    title: days > 0 ? `${days}-day Arena streak` : "Arena streak",
    status: streak?.played_today
      ? "Done for today"
      : days > 0
        ? "1 match keeps it"
        : "Play 1 match to start",
    done: Boolean(streak?.played_today),
    icon: Flame,
    accent: "text-orange-500",
  };
}

const TILE = "flex h-full items-center gap-3 rounded-2xl border border-border px-3 py-2.5";

export function TodayRow({
  wordle,
  passaparola,
  streaks,
}: {
  wordle: WordleTurnResult;
  passaparola: PassaparolaTurnResult;
  streaks: Streaks;
}) {
  const tiles = [
    wordleTile(wordle, streaks.wordle),
    passaparolaTile(passaparola, streaks.passaparola),
    arenaStreakTile(streaks.arena),
  ];

  return (
    <section aria-labelledby="today-heading" className="mx-auto w-full max-w-3xl space-y-2">
      <h2 id="today-heading" className="text-sm font-semibold text-muted-foreground">
        Today
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {tiles.map(({ title, status, done, icon: Icon, accent, href, streak }) => {
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
                      {streak}
                      <span className="sr-only">-day streak</span>
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{status}</span>
              </span>
              {done ? (
                <Check className="size-4 shrink-0 text-emerald-500" aria-label="Done" />
              ) : (
                href && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </>
          );
          return (
            <li key={title}>
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
    </section>
  );
}
