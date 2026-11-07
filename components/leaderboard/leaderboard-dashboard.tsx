"use client";

import { Trophy, Users } from "lucide-react";
import { fill, useT, useUiLanguage } from "@/components/ui-language-provider";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LeaderboardData } from "@/app/(app)/leaderboard/actions";
import { cn } from "@/lib/utils";

type LeaderboardDashboardProps = {
  data: LeaderboardData;
  isGuest?: boolean;
};

function rankBadge(rank: number) {
  if (rank === 1) {
    return "🥇";
  }
  if (rank === 2) {
    return "🥈";
  }
  if (rank === 3) {
    return "🥉";
  }
  return String(rank);
}

export function LeaderboardDashboard({ data, isGuest = false }: LeaderboardDashboardProps) {
  const t = useT();
  const uiLanguage = useUiLanguage();
  const { entries, currentUserId, language, level } = data;
  const currentUserEntry = entries.find((entry) => entry.userId === currentUserId);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Trophy className="size-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("Leaderboard")}
          </h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          {fill(t("Rankings for {language} · level {level}."), {
            language: <span className="font-medium text-foreground">{t(language)}</span>,
            level: <span className="font-medium text-foreground">{level}</span>,
          })}{" "}
          {t("Only real player vs player matches count — bot games are excluded.")}
        </p>
      </div>

      {isGuest && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("Guest accounts are not ranked")}</CardTitle>
            <CardDescription>
              {t("You can view this leaderboard, but guest players do not appear here. Sign up for a full account to compete in your proficiency bracket.")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {currentUserEntry ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("Your standing")}</CardTitle>
            <CardDescription>
              {t("Based on your PvP matches in this bracket.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("Rank")}</p>
              <p className="text-xl font-bold tabular-nums">#{currentUserEntry.rank}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("PvP matches")}</p>
              <p className="text-xl font-bold tabular-nums">
                {currentUserEntry.pvpMatches}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("Win rate")}</p>
              <p className="text-xl font-bold tabular-nums">
                {currentUserEntry.winRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("Total points")}</p>
              <p className="text-xl font-bold tabular-nums">
                {currentUserEntry.totalPoints.toLocaleString(uiLanguage)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/60 bg-card/50">
          <CardContent className="flex items-start gap-3 p-5 text-sm text-muted-foreground">
            <Users className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              {t("You are not on the board yet. Finish a live match against another player in {language} / {level} and your stats will appear here after the game ends.", { language: t(language), level })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">{t("Top players")}</CardTitle>
          <CardDescription>
            {t("Sorted by total points earned, then win rate, then matches played.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-6 sm:pb-6">
          {entries.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0">
              {t("No PvP matches recorded in this bracket yet. Be the first to play vs another user!")}
            </p>
          ) : (
            <>
              <ul className="space-y-2 px-4 pb-4 sm:hidden">
                {entries.map((entry) => {
                  const isCurrentUser = entry.userId === currentUserId;

                  return (
                    <li
                      key={entry.userId}
                      className={cn(
                        "rounded-xl border border-border/60 bg-card/40 px-3 py-3",
                        isCurrentUser && "border-primary/25 bg-primary/10"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-lg font-medium tabular-nums">
                            {rankBadge(entry.rank)}
                          </span>
                          <span className="truncate font-medium">
                            {entry.displayName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="shrink-0 text-xs">
                              {t("You")}
                            </Badge>
                          )}
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {entry.totalPoints.toLocaleString(uiLanguage)} pts
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>
                          {t("Matches:")}{" "}
                          <span className="font-medium text-foreground tabular-nums">
                            {entry.pvpMatches}
                          </span>
                        </span>
                        <span className="text-right">
                          {t("Win rate:")}{" "}
                          <span className="font-medium text-foreground tabular-nums">
                            {entry.winRate.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">#</TableHead>
                      <TableHead>{t("Player")}</TableHead>
                      <TableHead className="text-right">{t("Matches")}</TableHead>
                      <TableHead className="text-right">{t("Win %")}</TableHead>
                      <TableHead className="text-right">{t("Points")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const isCurrentUser = entry.userId === currentUserId;

                      return (
                        <TableRow
                          key={entry.userId}
                          className={cn(
                            isCurrentUser && "bg-primary/10 hover:bg-primary/10"
                          )}
                        >
                          <TableCell className="font-medium tabular-nums">
                            {rankBadge(entry.rank)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{entry.displayName}</span>
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-xs">
                                  {t("You")}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.pvpMatches}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.winRate.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {entry.totalPoints.toLocaleString(uiLanguage)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
