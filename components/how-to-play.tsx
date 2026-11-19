"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/components/ui-language-provider";
import type { Vars } from "@/lib/i18n";
import { markTutorialSeen } from "@/lib/tutorial-progress";
import { TUTORIALS, type TutorialGame } from "@/lib/tutorials";
import { hasSeenWelcomeTour, WELCOME_TOUR_EVENT } from "@/lib/welcome-tour";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

const HowToPlayOpenContext = createContext(false);

/** True while the how-to-play window is open. Timed games must not start their clock. */
export function useHowToPlayOpen(): boolean {
  return useContext(HowToPlayOpenContext);
}

function subscribeWelcomeTour(onChange: () => void) {
  window.addEventListener(WELCOME_TOUR_EVENT, onChange);
  return () => window.removeEventListener(WELCOME_TOUR_EVENT, onChange);
}

/** False until this browser has finished the welcome tour, so the two windows don't stack. */
function useWelcomeTourSeen(): boolean {
  return useSyncExternalStore(subscribeWelcomeTour, hasSeenWelcomeTour, () => false);
}

/**
 * "How to play" at the top of a game. Opens by itself the first time; Skip and
 * the last step both mark it seen. Guests use the same calls.
 */
export function HowToPlay({
  game,
  seen,
  children,
  buttonClassName,
  waitForWelcomeTour = false,
  vars,
}: {
  game: TutorialGame;
  /** From get_my_tutorials(). True also when that call failed, so play is not blocked. */
  seen: boolean;
  children: React.ReactNode;
  buttonClassName?: string;
  /** The Arena home waits until the welcome tour has closed. */
  waitForWelcomeTour?: boolean;
  /** Filled into a step, such as the Word Wheel's skip and stop words. */
  vars?: Vars;
}) {
  const t = useT();
  const tourSeen = useWelcomeTourSeen();
  const [opened, setOpened] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const tutorial = TUTORIALS[game];
  const [step, setStep] = useState(0);
  const waitingForTour = waitForWelcomeTour && !tourSeen;
  const open = (opened || (!seen && !dismissed)) && !waitingForTour;
  const isLast = step === tutorial.steps.length - 1;

  function dismiss() {
    setDismissed(true);
    setOpened(false);
    setStep(0);
    const supabase = createClient();
    void markTutorialSeen(supabase, game);
  }

  return (
    <HowToPlayOpenContext.Provider value={open}>
      <>
        <div className={cn("mb-3 flex justify-end", buttonClassName)}>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpened(true)}>
            {t("How to play")}
          </Button>
        </div>
        {children}
        <Dialog open={open} onOpenChange={(next) => (next ? setOpened(true) : dismiss())}>
          <DialogContent className="gap-5 p-6 sm:max-w-md">
            <DialogHeader>
              <p className="text-xs font-medium text-muted-foreground">
                {t("Step {n} of {total}", { n: step + 1, total: tutorial.steps.length })}
              </p>
              <DialogTitle className="text-lg font-semibold">{t(tutorial.title)}</DialogTitle>
              <DialogDescription className="leading-relaxed">{t(tutorial.steps[step], vars)}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              {step === 0 ? (
                <Button type="button" variant="ghost" onClick={dismiss}>
                  {t("Skip")}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                  {t("Back")}
                </Button>
              )}
              <Button type="button" onClick={() => (isLast ? dismiss() : setStep(step + 1))}>
                {isLast ? t("Start playing") : t("Next")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </HowToPlayOpenContext.Provider>
  );
}
