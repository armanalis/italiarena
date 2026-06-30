/** Public landing page with sign-in and sign-up entry points. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Trophy, Users, Zap } from "lucide-react";
import { AuroraCanvas } from "@/components/aurora-canvas";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal/privacy-policy";
import { getPostAuthPath } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

const features = [
  {
    icon: Zap,
    num: "01",
    title: "Just a few minutes a day",
    description:
      "Short sessions that fit your schedule — learn Italian without blocking out hours of study time.",
  },
  {
    icon: Users,
    num: "02",
    title: "Practice Italian with real people",
    description:
      "Practice Italian with others at your level through live quiz rounds at your pace.",
  },
  {
    icon: Trophy,
    num: "03",
    title: "Watch your skills grow",
    description:
      "Track vocabulary, accuracy, and match history as you improve over time.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthPath());
  }

  return (
    <AuroraCanvas>
      <main className="mx-auto w-full max-w-6xl px-4 pb-[max(3rem,env(safe-area-inset-bottom,0px))] pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-20">
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-14">
          <div className="space-y-8">
            <p className="swiss-label">Italian · live quiz matches</p>
            <h1 className="hero-headline max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem]">
              Learn Italian through quick, real practice
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Play timed rounds against real people or a bot. Pick up Italian
              words and grammar naturally — without long lessons or heavy study
              blocks.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 min-w-[9.5rem] px-6">
                <Link href="/login">
                  Sign in
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="glass-panel h-12 min-w-[9.5rem] border bg-transparent px-6 shadow-none"
              >
                <Link href="/login">Create account</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="h-12 px-6">
                <Link href="/guest">Play as guest</Link>
              </Button>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Guest mode works without signing up. You get an auto-generated name
              and won&apos;t appear on the leaderboard.
            </p>
          </div>

          <GlassPanel className="hidden p-6 lg:block lg:p-8">
            <p className="swiss-label">Session flow</p>
            <ol className="mt-6 space-y-5">
              {[
                "Choose your level and find an opponent.",
                "Answer timed questions across grammar, vocab, and more.",
                "Review mistakes and track progress on your dashboard.",
              ].map((step, index) => (
                <li key={step} className="flex gap-4 border-t border-border/80 pt-5 first:border-t-0 first:pt-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </GlassPanel>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="mb-8 flex items-end justify-between gap-4 border-b border-border pb-4">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Built for daily practice
            </h2>
            <span className="swiss-label hidden sm:inline">Features</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map(({ icon: Icon, num, title, description }) => (
              <GlassPanel key={title} className="p-5 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-muted/80 text-foreground">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {num}
                  </span>
                </div>
                <h3 className="font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <LegalFooter className="mt-12 sm:mt-16" />
      </main>
    </AuroraCanvas>
  );
}
