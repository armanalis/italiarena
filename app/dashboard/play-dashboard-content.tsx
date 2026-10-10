/** Main dashboard — choose real-player or bot matchmaking. */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminQueueBadge } from "@/components/admin/admin-queue-badge";
import { BotMatchCard } from "@/components/dashboard/bot-match-card";
import { ChallengeLinkButton } from "@/components/challenge/challenge-link-button";
import { JoinCodeForm } from "@/components/challenge/join-code-form";
import { OnlineLevelBadge } from "@/components/dashboard/online-players";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";
import { MatchmakingStartLink } from "@/components/matchmaking/matchmaking-start-link";
import { getAdminQueueCounts } from "@/lib/admin-queue-counts";
import { getCurrentUserProfile, isGuestUser } from "@/lib/auth";
import { Flame, PenLine, ShieldAlert, Swords, UserRound } from "lucide-react";
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
  const { data: streakRows } = await (await createClient()).rpc("get_my_streak");
  const streak = (streakRows as { streak: number; played_today: boolean }[] | null)?.[0];

  return (
    <main className="flex w-full min-w-0 flex-1 flex-col">
      <WelcomeTour />
      <header className="page-intro w-full px-4 pt-5 sm:px-8 sm:pt-6 lg:px-10 xl:px-12">
        <div className="flex w-full flex-wrap items-start justify-between gap-3 sm:items-center sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Play</h1>
            <p className="text-sm text-muted-foreground">
              {guest
                ? `Playing as ${profile.display_name ?? "Guest"}`
                : `Ready for ${profile.target_language}?`}
            </p>
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
            {streak && streak.streak > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400"
                title={
                  streak.played_today
                    ? "You played today. Come back tomorrow to keep it going."
                    : "Finish a match today to keep your streak."
                }
              >
                <Flame className="size-4" aria-hidden />
                {streak.streak}-day streak
                {!streak.played_today && <span className="sr-only">, play today to keep it</span>}
              </span>
            )}
            <OnlineLevelBadge level={profile.proficiency_level} />
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
          <div className="mx-auto w-full max-w-5xl rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-muted-foreground">
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

        <section className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-2 xl:gap-6">
          <Card className="border-border/60">
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Swords className="size-5" />
              </div>
              <CardTitle>Arena Duel</CardTitle>
              <CardDescription>
                Face a live player at your Italian level. After 10 seconds with
                no match, you can play the bot or return to the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="min-h-11 w-full">
                <MatchmakingStartLink href="/dashboard/matchmaking?mode=real">
                  Enter the Arena
                </MatchmakingStartLink>
              </Button>
              <ChallengeLinkButton className="mt-2 min-h-11" />
              <JoinCodeForm />
            </CardContent>
          </Card>

          <BotMatchCard />
        </section>

        {!guest && (
          <section className="mx-auto w-full max-w-5xl">
            <Card className="border-border/60">
              <CardHeader>
                <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PenLine className="size-5" />
                </div>
                <CardTitle>Contribute a question</CardTitle>
                <CardDescription>
                  Add Italian trivia to the pool. Submissions are checked for correct
                  CEFR level and category before they go live in matches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto">
                  <Link href="/dashboard/contribute">Submit a question</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
