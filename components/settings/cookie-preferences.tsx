/**
 * Withdrawal control for analytics consent. Art. 7(3) GDPR: taking consent back
 * must be as easy as giving it, so this mirrors the banner's two choices.
 */
"use client";

import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import { setCookieConsent } from "@/lib/cookie-consent";

const LABELS = {
  granted:
    "Analytics is on. Microsoft Clarity records heatmaps and session replays, with anything you type masked out.",
  denied: "Analytics is off. Only the cookies needed to sign in and play are used.",
  unset: "You have not answered the cookie banner yet. Analytics is off until you do.",
} as const;

export function CookiePreferences() {
  const consent = useCookieConsent();
  const status = consent ?? "unset";

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Optional analytics</p>
        <p className="text-sm text-muted-foreground">{LABELS[status]}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          variant={consent === "granted" ? "default" : "outline"}
          aria-pressed={consent === "granted"}
          onClick={() => setCookieConsent("granted")}
          className="min-w-28"
        >
          Allow
        </Button>
        <Button
          size="lg"
          variant={consent === "denied" ? "default" : "outline"}
          aria-pressed={consent === "denied"}
          onClick={() => setCookieConsent("denied")}
          className="min-w-28"
        >
          Turn off
        </Button>
      </div>
    </div>
  );
}
