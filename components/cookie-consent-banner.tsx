/**
 * Prior-consent banner for non-essential analytics (art. 122 Codice privacy).
 *
 * Garante guidelines of 10 June 2021: accepting and refusing must take the same
 * effort, so both buttons are the same size and equally reachable, and closing
 * the banner without choosing is not treated as consent.
 */
"use client";

import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { setCookieConsent } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const consent = useCookieConsent();

  // Already answered — nothing to ask.
  if (consent !== null) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p id="cookie-consent-title" className="text-sm font-medium text-foreground">
                Help us improve Italiarena?
              </p>
              <p className="text-sm text-muted-foreground">
                We&apos;d like to use Microsoft Clarity to see which parts of
                the app confuse people: heatmaps and session replays, with
                anything you type masked out. It&apos;s optional, the app works
                exactly the same if you say no, and you can change your mind in
                Settings. The cookies needed to sign in and play are always on.{" "}
                <Link
                  href="/privacy?lang=en#cookies"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Details in our privacy notice
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="lg"
                onClick={() => setCookieConsent("granted")}
                className="min-w-28 flex-1 sm:flex-none"
              >
                Accept
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setCookieConsent("denied")}
                className="min-w-28 flex-1 sm:flex-none"
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
