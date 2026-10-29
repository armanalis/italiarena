/** Arena: live matches against real players. Bot matches start from the sidebar (bot picker). */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlayerStatistics } from "@/app/(app)/settings/actions";
import { AdminQueueBadge } from "@/components/admin/admin-queue-badge";
import { ChallengeLinkButton } from "@/components/challenge/challenge-link-button";
import { JoinCodeForm } from "@/components/challenge/join-code-form";
import { ArenaSummary } from "@/components/dashboard/arena-summary";
import { TodayRow } from "@/components/dashboard/today-row";
import { OnlineLevelBadge } from "@/components/dashboard/online-players";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";
import { MatchmakingStartLink } from "@/components/matchmaking/matchmaking-start-link";
import { getAdminQueueCounts } from "@/lib/admin-queue-counts";
import { getCurrentUserProfile, isGuestUser } from "@/lib/auth";
import { playPassaparola } from "@/lib/passaparola";
import type { GameStreak } from "@/lib/push";
import { italyToday, playWordle } from "@/lib/wordle";
import { ArrowRight, ChevronRight, PenLine, ShieldAlert, Swords, UserRound } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

type PlayDashboardContentProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export async function PlayDashboardContent({
  searchParams,
}: PlayDashboardContentProps) {
  const profile = await getCurrentUserProfile();
  const params = await searchParams;
  const accessDenied = params.error === "admin_access_denied";

  if (!profile?.target_language || !profile.proficiency_level) {
    return null;
  }
  const guest = isGuestUser(profile);
  const adminQueue =
    profile.role === "admin"
      ? await getAdminQueueCounts()
      : { reported: 0, submissions: 0, total: 0 };
  const supabase = await createClient();
  const level = profile.proficiency_level;
  const language = profile.target_language;
  // Loads only: today's puzzles are not started or played from here.
  const [{ data: streakRows }, stats, wordle, passaparola] = await Promise.all([
    supabase.rpc("get_my_streaks"),
    getPlayerStatistics(),
    playWordle(supabase, language, level, italyToday(), null),
    playPassaparola(supabase, language, level),
  ]);
  const streaks = Object.fromEntries(
    ((streakRows as GameStreak[] | null) ?? []).map((row) => [row.game, row])
  );

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col">
      <WelcomeTour />
      <header className="page-intro w-full px-4 pt-5 sm:px-8 sm:pt-6 lg:px-10 xl:px-12">
        <div className="flex w-full flex-wrap items-start justify-between gap-3 sm:items-center sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Arena</h1>
            {guest && (
              <p className="text-sm text-muted-foreground">
                Playing as {profile.display_name ?? "Guest"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.role === "admin" && (
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/admin">
                  <ShieldAlert className="size-4" />
                  Admin
                  <AdminQueueBadge
                    count={adminQueue.total}
                    label="questions waiting for review"
                  />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1 flex-col gap-6 p-4 sm:gap-8 sm:p-8 lg:px-10 xl:px-12">
        {accessDenied && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Admin access denied. You do not have permission to view that page.
          </div>
        )}

        {guest && (
          <div className="mx-auto w-full max-w-3xl rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <UserRound className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                You&apos;re in <span className="font-medium text-foreground">guest mode</span>.
                Your name was assigned automatically and you won&apos;t appear on the
                proficiency leaderboard.{" "}
                <a href="/login?mode=signup" className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign up
                </a>{" "}
                for a full account to choose a username and compete on the board.
              </span>
            </p>
          </div>
        )}

        {/* Wide screens: play on the left, the player's summary on the right. */}
        <section className="mx-auto grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="size-5 text-primary" aria-hidden />
                Arena Duel
              </CardTitle>
              {/* Who is around, right next to the button that matches you with them. */}
              <CardAction>
                <OnlineLevelBadge level={level} />
              </CardAction>
              <CardDescription>Live 1v1 at your level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild size="lg" className="h-11 w-full md:h-10">
                <MatchmakingStartLink href="/matchmaking?mode=real">
                  Enter the Arena
                  <ArrowRight className="size-4" aria-hidden />
                </MatchmakingStartLink>
              </Button>
              {/* One row when there is room; otherwise the code field wraps below, full width. */}
              <div className="flex flex-wrap gap-2">
                <ChallengeLinkButton label="Invite a friend" className="h-11 w-auto flex-auto md:h-9" />
                <JoinCodeForm className="flex-[1_1_11rem]" />
              </div>
            </CardContent>
          </Card>

          <ArenaSummary stats={stats} />
        </section>

        <TodayRow wordle={wordle} passaparola={passaparola} streaks={streaks} />

        {!guest && (
          <Link
            href="/contribute"
            className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
          >
            <PenLine className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="font-medium">Know a good question?</span>{" "}
              <span className="text-muted-foreground">Add it to the pool for everyone to play.</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        )}
      </div>
    </main>
  );
}
