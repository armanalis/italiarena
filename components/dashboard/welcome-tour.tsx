/** First-visit walkthrough on the Play dashboard: four short steps, shown once per browser. */
"use client";

import { useState } from "react";
import {
  BarChart3,
  Sparkles,
  Swords,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBrowserValue } from "@/hooks/use-browser-value";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { APP_NAME } from "@/lib/legal";
import { hasSeenWelcomeTour, markWelcomeTourSeen } from "@/lib/welcome-tour";
import { cn } from "@/lib/utils";
import { useT } from "@/components/ui-language-provider";

type TourStep = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: "Welcome to {app}",
    body: "Learn Italian or German through quick 1v1 trivia matches: 10 timed questions on grammar, vocabulary, fill-in-the-blank, and idioms.",
  },
  {
    icon: Swords,
    title: "Pick your opponent",
    body: "Enter an Arena Duel against a live player at your level, or play a bot to start instantly. Choose Easy, Medium, or Hard.",
  },
  {
    icon: Timer,
    title: "Answer fast",
    body: "Correct answers score more the faster you tap. Tied after 10 questions? One sudden-death question decides it.",
  },
  {
    icon: BarChart3,
    title: "Learn from mistakes",
    body: "Review your wrong answers after each match, then practise them in Stats. Track your rank on the Leaderboard.",
  },
];

export function WelcomeTour() {
  const t = useT();
  const consent = useCookieConsent();
  const seen = useBrowserValue(hasSeenWelcomeTour, true);
  const [closed, setClosed] = useState(false);
  const [step, setStep] = useState(0);
  // Wait for the cookie banner to be answered so the two don't stack.
  const open = consent !== null && !seen && !closed;

  function close() {
    markWelcomeTourSeen();
    setClosed(true);
  }

  const isLast = step === STEPS.length - 1;
  const { icon: Icon, title, body } = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-7" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {t("Step {n} of {total}", { n: step + 1, total: STEPS.length })}
          </p>
          <DialogTitle className="text-lg font-semibold">{t(title, { app: APP_NAME })}</DialogTitle>
          <DialogDescription className="leading-relaxed">{t(body)}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === step
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground opacity-40"
              )}
            />
          ))}
        </div>

        <DialogFooter>
          {step === 0 ? (
            <Button variant="ghost" onClick={close}>
              {t("Skip")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              {t("Back")}
            </Button>
          )}
          <Button onClick={() => (isLast ? close() : setStep(step + 1))}>
            {isLast ? t("Start playing") : t("Next")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
