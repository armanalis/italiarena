import Link from "next/link";
import { Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/legal";

export function PrivacyDataCard() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <Shield className="size-5 text-indigo-400" />
          <CardTitle>Privacy &amp; data</CardTitle>
        </div>
        <CardDescription>
          How we handle your data under GDPR and Italian privacy law.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <ul className="list-inside list-disc space-y-2">
          <li>
            We only collect data needed to run the app (account, gameplay stats,
            match history, and optional reports or AI explanations).
          </li>
          <li>
            Your data is stored securely (HTTPS), never sold to third parties,
            and you can exercise your rights under GDPR and Italian privacy law.
          </li>
          <li>
            You can update your profile here,{" "}
            <a href="#delete-account" className="text-primary underline-offset-4 hover:underline">
              delete your account
            </a>{" "}
            at any time, or contact us to access or correct your data.
          </li>
        </ul>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/privacy"
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 bg-muted/30 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            Read full Privacy Policy
          </Link>
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent("Language Quiz — privacy request")}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
          >
            Contact about my data
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
