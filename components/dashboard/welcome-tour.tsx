/** First-visit walkthrough on the Play dashboard: four short steps, shown once per browser. */
"use client";

import { useEffect, useState } from "react";
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
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { APP_NAME } from "@/lib/legal";
import { hasSeenWelcomeTour, markWelcomeTourSeen } from "@/lib/welcome-tour";
import { cn } from "@/lib/utils";

type TourStep = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: `Welcome to ${APP_NAME}`,
    body: "Learn Italian through quick 1v1 trivia matches: 10 timed questions on grammar, vocabulary, fill-in-the-blank, and idioms.",
  },
  {
    icon: Swords,
    title: "Pick your opponent",
    body: "Find a real player at your level, or play the bot to start instantly. Choose Easy, Medium, or Hard.",
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
  const consent = useCookieConsent();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Wait for the cookie banner to be answered so the two don't stack.
    if (consent !== null && !hasSeenWelcomeTour()) {
      setOpen(true);
    }
  }, [consent]);

  function close() {
    markWelcomeTourSeen();
    setOpen(false);
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
            Step {step + 1} of {STEPS.length}
          </p>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{body}</DialogDescription>
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
              Skip
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          <Button onClick={() => (isLast ? close() : setStep(step + 1))}>
            {isLast ? "Start playing" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
