/** Public landing page with sign-in and sign-up entry points. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Languages, Trophy, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPostAuthPath } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthPath());
  }

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden bg-background touch-scroll">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.25),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.18),_transparent_50%)]" />

      <div className="relative mx-auto flex min-h-app w-full max-w-5xl flex-col items-center justify-center px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom,0px))] text-center sm:px-6 sm:py-16">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xl shadow-indigo-500/30 sm:size-16">
          <Languages className="size-7 sm:size-8" />
        </div>

        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
          Learn a new language the easy way
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Practice through quick, playful sessions that take just a few minutes.
          Pick up words and grammar naturally as you go — without long lessons
          or feeling like learning is hard work.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-12 min-w-40 bg-gradient-to-r from-indigo-600 to-violet-600 px-8 text-base font-semibold shadow-lg shadow-indigo-500/25"
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 min-w-40 px-8 text-base">
            <Link href="/login">Sign Up</Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-left backdrop-blur-sm">
            <Zap className="mb-3 size-5 text-indigo-400" />
            <p className="font-medium">Just a few minutes a day</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Short sessions that fit into your schedule — learn without blocking
              out hours of study time.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-left backdrop-blur-sm">
            <Users className="mb-3 size-5 text-indigo-400" />
            <p className="font-medium">Learn with real people</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Practice with others at your level and build confidence through
              real back-and-forth conversation.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-left backdrop-blur-sm">
            <Trophy className="mb-3 size-5 text-indigo-400" />
            <p className="font-medium">Watch your skills grow</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your progress as your vocabulary and accuracy improve over
              time.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
