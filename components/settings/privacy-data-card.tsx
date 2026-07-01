import Link from "next/link";
import { Shield } from "lucide-react";
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
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <CardTitle>Privacy &amp; data</CardTitle>
        </div>
        <CardDescription>
          How we handle your data under the GDPR and Italian Privacy Code
          (D.Lgs. 196/2003).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <ul className="list-inside list-disc space-y-2">
          {PRIVACY_SETTINGS_SUMMARY.map((item, index) => (
            <li key={item}>
              {index === 2 ? (
                <>
                  You can update your profile in Settings,{" "}
                  <a
                    href="#delete-account"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    delete your account
                  </a>{" "}
                  at any time, or contact us to exercise your rights under the
                  GDPR and Italian privacy law.
                </>
              ) : (
                item
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/privacy"
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 bg-muted/30 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            Read full privacy notice
          </Link>
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} — privacy request`)}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
          >
            Contact about my data
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
