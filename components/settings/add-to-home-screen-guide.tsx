"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/legal";
import { cn } from "@/lib/utils";
import { useT } from "@/components/ui-language-provider";

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isInstalledApp() {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Opened from the Home Screen; false on the server. */
function useIsInstalledApp() {
  return useSyncExternalStore(subscribeToDisplayMode, isInstalledApp, () => false);
}

function StepList({
  steps,
  className,
}: {
  steps: string[];
  className?: string;
}) {
  const t = useT();
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-relaxed">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <span className="pt-0.5 text-muted-foreground">{t(step, { app: APP_NAME })}</span>
        </li>
      ))}
    </ol>
  );
}

export function AddToHomeScreenGuide() {
  const t = useT();
  const installed = useIsInstalledApp();

  return (
    <Card className="border-border ">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="size-5" />
          </div>
          <div>
            <CardTitle>{t("Add to your home screen")}</CardTitle>
            <CardDescription className="mt-1.5">
              {t("Install {app} like an app for quick access, full screen, smoother mobile play, and out-of-app notifications on iPhone.", { app: APP_NAME })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {installed ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>
              {t("You're already using the installed app. Open it from your home screen anytime to jump straight into a match — and enable daily reminders in Settings for out-of-app alerts.")}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">iPhone (Safari)</h3>
              <p className="text-xs text-muted-foreground">
                {t("Use Safari — other browsers on iPhone can't add sites to the home screen.")}
              </p>
              <StepList
                steps={[
                  "Open this website in Safari.",
                  "Tap the three dots (•••) at the bottom of the screen.",
                  "Tap Share in the menu that opens.",
                  "In the share panel, scroll down and tap Add to Home Screen.",
                  "Tap Add in the top-right corner. The app icon will appear on your home screen.",
                  "Open {app} from that icon, then turn on Daily practice reminder in Settings.",
                ]}
              />
            </div>

            <div className="h-px bg-border/60" />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Android (Chrome)</h3>
              <p className="text-xs text-muted-foreground">
                {t("Chrome works best. Some phones may show Install app instead of Add to Home screen.")}
              </p>
              <StepList
                steps={[
                  "Open this website in Chrome.",
                  "Tap the three dots (⋮) in the top-right corner.",
                  "Tap Install app or Add to Home screen.",
                  "Confirm Install or Add. The app icon will appear on your home screen or app drawer.",
                ]}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
