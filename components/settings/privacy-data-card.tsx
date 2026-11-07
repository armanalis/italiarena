"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { fill, useT } from "@/components/ui-language-provider";
import { CookiePreferences } from "@/components/settings/cookie-preferences";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APP_NAME,
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_SETTINGS_SUMMARY,
} from "@/lib/legal";

export function PrivacyDataCard() {
  const t = useT();
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <CardTitle>{t("Privacy & data")}</CardTitle>
        </div>
        <CardDescription>
          {t("How we handle your data under the GDPR, the Italian Privacy Code (D.Lgs. 196/2003), and related Italian rules on cookies, electronic communications, and AI.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <ul className="list-inside list-disc space-y-2">
          {PRIVACY_SETTINGS_SUMMARY.map((item, index) => (
            <li key={item}>
              {index === 2 ? (
                <>
                  {fill(t("You can update your profile in Settings, {delete} at any time, or contact us to exercise your rights. You may also lodge a complaint with the Garante per la protezione dei dati personali."), {
                    delete: (
                      <a href="#delete-account" className="text-primary underline-offset-4 hover:underline">
                        {t("delete your account")}
                      </a>
                    ),
                  })}
                </>
              ) : (
                t(item)
              )}
            </li>
          ))}
        </ul>

        <CookiePreferences />

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/privacy?lang=en"
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 bg-muted/30 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            {t("Read full privacy notice")}
          </Link>
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} — privacy request`)}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
          >
            {t("Contact about my data")}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
