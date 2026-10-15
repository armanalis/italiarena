/** The Arena's side card: a few numbers from Stats, with a link to the full page. */
import Link from "next/link";
import { ChevronRight, Target, Trophy } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryResults, overallAccuracy, pct } from "@/lib/player-stats";
import { cn } from "@/lib/utils";
import type { PlayerStats } from "@/types/database.types";

export function ArenaSummary({ stats }: { stats: PlayerStats | null }) {
  const played = stats?.matches_played ?? 0;
  // Question types answered at least once, best accuracy first (ties keep their order).
  const ranked = stats
    ? categoryResults(stats)
        .filter((row) => row.total > 0)
        .sort((a, b) => b.correct / b.total - a.correct / a.total)
    : [];
  const best = ranked[0];
  const weakest = ranked.length > 1 ? ranked.at(-1) : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your summary</CardTitle>
        <CardAction>
          <Link
            href="/stats"
            className="-my-3 inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            All stats
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {!stats || played === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matches yet. Enter the Arena or pick Play with bots to see your numbers
            here.
          </p>
        ) : (
          <>
            {/* Wins only once there is one: "0 wins" should not be the first thing a beginner reads. */}
            <dl className={cn("grid gap-2 text-center", stats.matches_won > 0 ? "grid-cols-3" : "grid-cols-2")}>
              {[
                ["Matches", played],
                ...(stats.matches_won > 0 ? [["Wins", stats.matches_won]] : []),
                ["Accuracy", overallAccuracy(stats)],
              ].map(([label, value]) => (
                // Label first for screen readers, number on top on screen.
                <div key={label} className="flex flex-col-reverse rounded-xl bg-muted px-1 py-2">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="text-lg font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            {best && (
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Trophy className="size-4 text-amber-500" aria-hidden />
                    Best category
                  </span>
                  <span className="font-medium capitalize">
                    {best.label.toLowerCase()} · {pct(best.correct, best.total)}
                  </span>
                </li>
                {weakest && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Target className="size-4 text-sky-500" aria-hidden />
                      To practise
                    </span>
                    <span className="font-medium capitalize">
                      {weakest.label.toLowerCase()} · {pct(weakest.correct, weakest.total)}
                    </span>
                  </li>
                )}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
