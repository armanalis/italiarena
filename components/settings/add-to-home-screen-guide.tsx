"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function useIsInstalledApp() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    setInstalled(standalone);
  }, []);

  return installed;
}

function StepList({
  steps,
  className,
}: {
  steps: string[];
  className?: string;
}) {
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3 text-sm leading-relaxed">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <span className="pt-0.5 text-muted-foreground">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function AddToHomeScreenGuide() {
  const installed = useIsInstalledApp();

  return (
    <Card className="border-border ">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="size-5" />
          </div>
          <div>
            <CardTitle>Add to your home screen</CardTitle>
            <CardDescription className="mt-1.5">
              Install Language Quiz like an app for quick access, full screen, and a
              smoother mobile experience.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {installed ? (
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            <p>
              You&apos;re already using the installed app. Open it from your home
              screen anytime to jump straight into a match.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">iPhone (Safari)</h3>
              <p className="text-xs text-muted-foreground">
                Use Safari — other browsers on iPhone can&apos;t add sites to the home
                screen.
              </p>
              <StepList
                steps={[
                  "Open this website in Safari.",
                  "Tap the three dots (•••) at the bottom of the screen.",
                  "Tap Share in the menu that opens.",
                  "In the share panel, scroll down and tap Add to Home Screen.",
                  "Tap Add in the top-right corner. The app icon will appear on your home screen.",
                ]}
              />
            </div>

            <div className="h-px bg-border/60" />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Android (Chrome)</h3>
              <p className="text-xs text-muted-foreground">
                Chrome works best. Some phones may show Install app instead of Add to
                Home screen.
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
