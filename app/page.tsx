/** Public landing page with sign-in and sign-up entry points. */
import Link from "next/link";
import { Saira } from "next/font/google";
import { redirect } from "next/navigation";
import { Trophy, Users, Zap } from "lucide-react";
import { DemoRound } from "@/components/landing/demo-round";
import { Button } from "@/components/ui/button";
import { LegalFooter } from "@/components/legal/privacy-policy";
import { getPostAuthPath } from "@/lib/auth";
import { pickDemoQuestions } from "@/lib/landing-demo-questions";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";

/** Squared, width-variable display face — a nod to Turin's Nebiolo foundry (Eurostile). */
const display = Saira({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
});

const steps = [
  "Choose your level and find an opponent.",
  "Answer timed questions across grammar, vocab, and more.",
  "Review mistakes and track progress on your dashboard.",
];

const features = [
  {
    icon: Zap,
    title: "Just a few minutes a day",
    description:
      "Short sessions that fit your schedule — learn Italian without blocking out hours of study time.",
  },
  {
    icon: Users,
    title: "Practice Italian with real people",
    description:
      "Practice Italian with others at your level through live quiz rounds at your pace.",
  },
  {
    icon: Trophy,
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
    <div className={cn("landing min-h-full w-full", display.variable)}>
      <main className="mx-auto w-full max-w-6xl px-4 pb-[max(3rem,env(safe-area-inset-bottom,0px))] pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pt-20">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <div className="space-y-8">
            <h1 className="landing-display landing-headline max-w-2xl">
              Learn Italian through quick, real practice
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Play timed rounds against real people or a bot. Pick up Italian
              words and grammar naturally — without long lessons or heavy study
              blocks.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-12 min-w-[9.5rem] px-6 text-base">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 min-w-[9.5rem] px-6 text-base"
              >
                <Link href="/login?mode=signup">Create account</Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="h-12 px-6 text-base">
                <Link href="/guest">Play as guest</Link>
              </Button>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Guest mode works without signing up. You get an auto-generated name
              and won&apos;t appear on the leaderboard.
            </p>
          </div>

          <DemoRound questions={pickDemoQuestions()} />
        </section>

        <section className="mt-20 sm:mt-28" aria-labelledby="how-a-match-works">
          <h2
            id="how-a-match-works"
            className="landing-display text-2xl font-semibold sm:text-3xl"
          >
            How a match works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-10">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex items-baseline gap-5 border-t border-border pt-5 sm:block"
              >
                <span
                  className="landing-display landing-step-number w-10 shrink-0 sm:w-auto"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <p className="max-w-xs text-base leading-relaxed sm:mt-4">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 sm:mt-28" aria-labelledby="daily-practice">
          <h2
            id="daily-practice"
            className="landing-display text-2xl font-semibold sm:text-3xl"
          >
            Built for daily practice
          </h2>
          <ul className="mt-8">
            {features.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="grid gap-2 border-t border-border py-6 sm:grid-cols-[minmax(0,22rem)_1fr] sm:gap-10"
              >
                <h3 className="flex items-center gap-3 font-semibold">
                  <Icon className="size-5 shrink-0 text-accent" aria-hidden />
                  {title}
                </h3>
                <p className="max-w-xl leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <LegalFooter className="mt-12 sm:mt-16" />
      </main>
    </div>
  );
}
