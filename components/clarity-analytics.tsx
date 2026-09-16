/**
 * Microsoft Clarity tag — heatmaps and session replay.
 *
 * Loads only in production and only after the user has granted consent in the
 * banner, so no analytics storage is written before the choice (art. 122
 * Codice privacy). Revoking consent unmounts this and stops the tag.
 */
"use client";

import Script from "next/script";
import { useCookieConsent } from "@/hooks/use-cookie-consent";

const CLARITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "yi76qxrdz9";

export function ClarityAnalytics() {
  const consent = useCookieConsent();

  if (
    consent !== "granted" ||
    process.env.NODE_ENV !== "production" ||
    !CLARITY_PROJECT_ID
  ) {
    return null;
  }

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
      window.clarity("consent", true);
      window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });`}
    </Script>
  );
}
