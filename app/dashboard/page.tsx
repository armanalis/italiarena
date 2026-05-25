/** Main dashboard — choose real-player or bot matchmaking. */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireOnboardingComplete } from "@/lib/auth";
import { formatDisplayName } from "@/lib/display-name";
import { Ghost, ShieldAlert, Users } from "lucide-react";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const profile = await requireOnboardingComplete();
  const params = await searchParams;
  const accessDenied = params.error === "admin_access_denied";

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-border/60 px-4 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Play</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {formatDisplayName(profile)}. Ready for{" "}
              {profile.target_language}?
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {profile.role === "admin" && (
              <Button asChild variant="outline" className="min-h-10">
                <Link href="/admin">
                  <ShieldAlert className="size-4" />
                  Admin
                </Link>
              </Button>
            )}
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              {profile.proficiency_level}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4 sm:gap-8 sm:p-8">
        {accessDenied && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Admin access denied. You do not have permission to view that page.
          </div>
        )}

        <section className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                <Users className="size-5" />
              </div>
              <CardTitle>Play vs real user</CardTitle>
              <CardDescription>
                Match with a live opponent at your language and level. Search ends
                after 15 seconds if nobody joins.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="min-h-11 w-full">
                <Link href="/dashboard/matchmaking?mode=real">Find real opponent</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Ghost className="size-5" />
              </div>
              <CardTitle>Play vs bot</CardTitle>
              <CardDescription>
                Jump straight into a ghost match — no waiting for another player.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="min-h-11 w-full">
                <Link href="/dashboard/matchmaking?mode=bot">Play vs ghost</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
